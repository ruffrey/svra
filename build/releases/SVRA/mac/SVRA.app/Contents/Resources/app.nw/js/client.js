/**
 * Client audio app
 */

    /** How often to update the UI */
var MAG_INTERVAL = 250,
    /** Last time the UI was updated with the current dB */
    LAST_UPDATE = +new Date(),
    /** The last captured dB of loudness, near-instantly captured */
    lastCapture = null,
    /** Base room decibels */
    ROOM_MAG = 45,
    /** Hmm... */
    WIGGLE_ROOM = 5,
    /** Is calibrate() running? */
    calibrateOn = false,
    /** Used when calibrate() is running to track the dB values */
    calibrate_array = [],
    captureNext = false,
    /** The last/current score for the experiment */
    SCORE = 0,

    CurrentExperiment = {
        end: function(){},
        start: function(){},
        pause: function(){},
        continue: function(){}
    };

function SetUiDecibels(m) {
    $('span#decibels').text(m.toFixed(2));
    if(calibrateOn) calibrate_array.push(m);
}
function calibrate() {

    console.log("RECALIBRATION START");
    clearRoomMag();
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
		
		setRoomMag(avg);

		console.log('RECALIBRATION END', calibrate_array);
		calibrate_array = [];

		$('#calibrate').removeAttr('disabled');

	}, 5000);

}

function Decibels(amplitude, ref) {

    var log10 = function(val) { return Math.log(val) / Math.LN10; };

    if(ref) return 20 * log10(amplitude/ref);

    return 20 * log10(amplitude/ROOM_MAG);
}

function setRoomMag(db) {
	ROOM_MAG = db;
	$('#room_mag').text(db.toFixed(2));
}

function clearRoomMag() {
    $('#room_mag').text('----');
}


var audioContext = new AudioContext(),
    audioInput = null,
    realAudioInput = null,
    inputPoint = null,
    audioRecorder = null,
    rafID = null,
    analyserContext = null,
    canvasWidth, canvasHeight,
    recIndex = 0;

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

/**
 * Main method for checking audio magnitude.
 */
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
            magnitude = magnitude / multiplier;
            var magnitude2 = freqByteData[i * multiplier];
            analyserContext.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
            analyserContext.fillRect(i * SPACING, canvasHeight, BAR_WIDTH, -magnitude);

            if(magnitude > MaxMagnitude) MaxMagnitude = magnitude+0;
        }
    	
        // see if we need to capture magnitude value
    	var now = +new Date(),
            sinceLastUpdate = now - LAST_UPDATE,
            dbValue = Decibels(MaxMagnitude);

    	if( sinceLastUpdate > MAG_INTERVAL ) 
    	{
    		LAST_UPDATE = now;
    		SetUiDecibels( dbValue );
    	}
        lastCapture = Math.round(dbValue);
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

