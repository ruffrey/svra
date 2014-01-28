var MAG_INTERVAL = 500;
var MAGNITUDE = 0;
var LAST_UPDATE = +new Date();
var ROOM_DB = 45;
var calibrateOn = false;
var calibrate_array = [];
var captureNext = false;
var lastCapture = null;
var SCORE = 0;

var CurrentExperiment = {
    end: function(){},
    start: function(){},
    pause: function(){},
    continue: function(){}
};

function SetMagnitude(m) {
    $('span#magnitude').text(m.toFixed(2));
    if(calibrateOn) calibrate_array.push(m);
}
function calibrate() {

    console.log("RECALIBRATION START");
    clearRoomDB();
	calibrateOn = true;

	$('#calibrate').attr('disabled','disabled');
	setTimeout(function(){
		calibrateOn = false;

		var tot = 0;
		for(var i=0; i<calibrate_array.length; i++)
		{
			tot += calibrate_array[i];
		}
		
		var avg = tot/calibrate_array.length;
		
		setRoomDB(avg);

		console.log('RECALIBRATION END', calibrate_array);
		calibrate_array = [];

		$('#calibrate').removeAttr('disabled');

	}, 5000);

}

function log10(val) {
  return Math.log(val) / Math.LN10;
}

function Decibels(amplitude) {
    return 20 * log10(amplitude);
}

function setRoomDB(db) {
	ROOM_DB = db;
	$('#room_db').text(db.toFixed(2));
}

function clearRoomDB() {
    $('#room_db').text('----');
}


var audioContext = new AudioContext();
var audioInput = null,
    realAudioInput = null,
    inputPoint = null,
    audioRecorder = null;
var rafID = null;
var analyserContext = null;
var canvasWidth, canvasHeight;
var recIndex = 0;

function saveAudio() {
    audioRecorder.exportWAV( doneEncoding );
    // could get mono instead by saying
    // audioRecorder.exportMonoWAV( doneEncoding );
}

function drawWave( buffers ) {
    var canvas = document.getElementById( "wavedisplay" );

    drawBuffer( canvas.width, canvas.height, canvas.getContext('2d'), buffers[0] );
}

function doneEncoding( blob ) {
    Recorder.forceDownload( blob, "myRecording" + ((recIndex<10)?"0":"") + recIndex + ".wav" );
    recIndex++;
}

function toggleRecording( e ) {
    if ($(e).find('.glyphicon-stop').length) {
        // currently recording
        audioRecorder.stop();
        $(e)
        .addClass('btn-success')
        .removeClass('btn-danger')
        .find('.glyphicon-stop').addClass('glyphicon-record').removeClass('glyphicon-stop');
        audioRecorder.getBuffers( drawWave );
    } else {
        // start recording
        if (!audioRecorder)
            return;
        audioRecorder.clear();
        audioRecorder.record();
        $(e)
        .addClass('btn-danger')
        .removeClass('btn-success')
        .find('.glyphicon-record').addClass('glyphicon-stop').removeClass('glyphicon-record');
    }
}

function convertToMono( input ) {
    var splitter = audioContext.createChannelSplitter(2);
    var merger = audioContext.createChannelMerger(2);

    input.connect( splitter );
    splitter.connect( merger, 0, 0 );
    splitter.connect( merger, 0, 1 );
    return merger;
}

function cancelAnalyserUpdates() {
    window.cancelAnimationFrame( rafID );
    rafID = null;
}

function updateAnalysers(time) {
    if (!analyserContext) 
    {
        var canvas = document.getElementById("analyser");
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        analyserContext = canvas.getContext('2d');
    }

    // analyzer draw code here
    {
    	var MaxMagnitude = 0;
        var SPACING = 3;
        var BAR_WIDTH = 1;
        var numBars = Math.round(canvasWidth / SPACING);
        var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);

        analyserNode.getByteFrequencyData(freqByteData); 

        analyserContext.clearRect(0, 0, canvasWidth, canvasHeight);
        analyserContext.fillStyle = '#F6D565';
        analyserContext.lineCap = 'round';
        var multiplier = analyserNode.frequencyBinCount / numBars;

        // Draw rectangle for each frequency bin.
        for (var i = 0; i < numBars; ++i) {
            var magnitude = 0;
            var offset = Math.floor( i * multiplier );

            // gotta sum/average the block, or we miss narrow-bandwidth spikes
            for (var j = 0; j< multiplier; j++)
                magnitude += freqByteData[offset + j];
            // magnitude = magnitude / multiplier;
            magnitude = Decibels(magnitude / multiplier);
            var magnitude2 = freqByteData[i * multiplier];
            analyserContext.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
            analyserContext.fillRect(i * SPACING, canvasHeight, BAR_WIDTH, -magnitude);

            if(magnitude > MaxMagnitude) MaxMagnitude = magnitude+0;
        }
    	
    	var now = +new Date();
    	if( (now - LAST_UPDATE) > MAG_INTERVAL ) 
    	{
    		LAST_UPDATE = now;
    		SetMagnitude( MaxMagnitude );
    	}
        lastCapture = MaxMagnitude;
    }
    
    rafID = window.requestAnimationFrame( updateAnalysers );
}

function toggleMono() {
    if (audioInput != realAudioInput) {
        audioInput.disconnect();
        realAudioInput.disconnect();
        audioInput = realAudioInput;
    } else {
        realAudioInput.disconnect();
        audioInput = convertToMono( realAudioInput );
    }

    audioInput.connect(inputPoint);
}

function gotStream(stream) {
    inputPoint = audioContext.createGain();

    // Create an AudioNode from the stream.
    realAudioInput = audioContext.createMediaStreamSource(stream);
    audioInput = realAudioInput;
    audioInput.connect(inputPoint);

//    audioInput = convertToMono( input );

    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    inputPoint.connect( analyserNode );

    audioRecorder = new Recorder( inputPoint );

    zeroGain = audioContext.createGain();
    zeroGain.gain.value = 0.0;
    inputPoint.connect( zeroGain );
    zeroGain.connect( audioContext.destination );
    updateAnalysers();
}

function initAudio(callback) {
        if (!navigator.getUserMedia)
            navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        if (!navigator.cancelAnimationFrame)
            navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
        if (!navigator.requestAnimationFrame)
            navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

    navigator.getUserMedia({audio:true}, 
        function OnSuccessGetUserMedia (stream) {

            gotStream(stream);
            if(callback) callback(null, stream);

        }, 
        function OnErrorGetUserMedia(e) {
            alert('Error getting audio');
            console.log(e);
            if(callback) callback(e, null);
        }
    );
}



function SwitchExperiment(expName) {

	$.getScript('/js/exp/' + expName + ".js", function(script) {

	}).error(function(){
		alert('Error loading experiment: ' + expName);
	});

	$('#tabnav a').attr('disabled', 'disabled');

}

function StopExperiment(expName) {
	$('#tabnav a').removeAttr('disabled');
}

// jQuery Init
$(function(){

	$('#tabnav a').click(function (e) {
	  e.preventDefault();
	  $(this).tab('show');
	  history.pushState({}, $(this).text(), location.pathname + $(this).attr('href'));
	  SwitchExperiment( $(this).attr('href').replace('#','') );
	});

	if(location.hash)
	{
		$('a[href="' + location.hash + '"]').click();
	}

	initAudio(function(){
        calibrate();
    });


    $('#exp-continue').click(function() {
        // $('#exp-score').removeClass('label-default').addClass('label-inverse');
        $('#exp-score')
        .css('opacity',1)
        .css('backgroundColor','#000000')
        .css('color', '#ffffff');

        $(this).hide();
        $('#exp-pause')
        .css('opacity',0)
        .show();

        setTimeout(function(){
            $('#exp-pause').fadeTo(1,1000);
        }, CurrentExperiment.loopInterval || 5000);
    });

    $('#exp-pause').click(function() {
        var pause = $(this);

        $('#exp-score')
        .animate({
            opacity: 1,
            backgroundColor: '#f9f9f9',
            color: '#3333FF'
        }, 500);

        $(this).hide();
        $('#exp-continue').fadeIn(400);

    });

    SetScore();
    
    // $('#exp-modal').on('shown.bs.modal', function(){
    //     StartExperiment();
    // });

});

function StartExperiment() {
    SCORE = 0; 
    SetScore();
    console.log('experiment started inside StartExperiment()', new Date());
    CurrentExperiment.start();
    
    $('#exp-done,#exp-continue').fadeOut(200);
    $('#exp-pause').slideDown(350);
}

function EndExperiment() {
    $('#exp-done').fadeIn(350);
    $('#exp-pause').hide(200);
}

function SetScore() {
    $('#exp-score, #score')
    .each(function(){

        var origColor = $(this).css('backgroundColor');

        $(this)
        .css('backgroundColor', '#FFAD33')
        .css('color', '#000000');

        $(this).text( SCORE.toString() );

        $(this).animate({
            backgroundColor: origColor,
            color: '#ffffff'
        }, 600);

    });
    
}

function RemoveData(row, ix) {
    store.removeExperiment(ix);
    ShowDataManager();
}

function datarow(d) {
    return '<tr>'
            + '<td><button class="btn btn-info" onclick="DownloadData('+d.storageIndex()+');"><i class="glyphicon glyphicon-download"></i></button></td>'
            + '<td>'+d.created()+'</td>'
            + '<td>'+d.method()+'</td>'
            + '<td>'+(d.records.get().length-1)+'</td>'
            + '<td><button class="btn btn-danger" onclick="RemoveData('+d.storageIndex()+');"><i class="glyphicon glyphicon-remove"></i></button></td>'
        + '</tr>';
}


function IncrementScore(incr) {

    incr = incr || 1;
    SCORE += incr;

    SetScore();

}

function PlayBeep() {
    $('#beep')[0].play();
}
function PlayEndBeep() {
    $('#end-beep')[0].play();
}


function ShowDataManager() {
    var $tbody = $('#datamanager table#data-table tbody');

    var allRecords = store.getExperiments();
    var rowhtml = allRecords.map(datarow).join('');

    $tbody.empty().append( rowhtml );

    $('#datamanager').modal('show');
}

function DownloadData(ix) {

    var data = store.getExperiments(ix);

    var downloadData = encodeURIComponent(data.records.get().map(function(r) {
        return r.join(',');
    }).join('\n'));

    var link = window.document.createElement('a');
    link.href = "data:application/octet-stream," + downloadData;
    link.download = data.method() + ' ' + data.created() + '.csv';
    var click = document.createEvent("Event");
    click.initEvent("click", true, true);
    link.dispatchEvent(click);
    
}

if(env=="production")
{
	window.onbeforeunload = function() {
		return "Careful when refreshing the page!";
	}
}
