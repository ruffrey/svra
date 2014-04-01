/**
 * # Client audio app
 */
(function(){})();



var twoMinutes = 60 * 2 * 1000,    
    /** How often to update the UI */
    MAG_INTERVAL = 498,
    /** Last time the UI was updated with the current dB */
    LAST_UPDATE = +new Date(),
    /** The last captured dB of loudness, near-instantly captured */
    lastCapture = null,
    /** The last captured magnitude of loudness */
    lastMag = null,
    /** Base room magnitude noise */
    ROOM_MAG = 75,
    ROOM_DB = 45,
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
    },

    timesHitM = 0;

/**
 *
 */
function SetUiDecibels(d, m) {
    $('span#decibels').text(d.toFixed(2));
    $('span#magnitude').text(m.toFixed(2));
    if(calibrateOn) calibrate_array.push(m);
}

/**
 * Perform calibration for 5 seconds.
 */
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

/**
 * Calculate decibels
 * @returns Number
 */
function Decibels(amplitude, refDB) {

    var log10 = function(val) { return Math.log(val) / Math.LN10; };

    if(refDB) return 20 * log10(amplitude/refDB);

    // return 20 * log10(amplitude/ROOM_DB);
    return 20 * log10(amplitude);
}

/**
 * Sets db and UI
 */
function setRoomMag(val) {
	ROOM_MAG = val;
    ROOM_DB = Decibels(ROOM_MAG);
    $('#room_mag').text(ROOM_MAG.toFixed(2));
	$('#room_db').text(ROOM_DB.toFixed(2));
}

/**
 * for UI only
 */
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

/**
 * export as raw wav file
 */
function saveAudio() {
    audioRecorder.exportWAV( doneEncoding );
    // could get mono instead by saying
    // audioRecorder.exportMonoWAV( doneEncoding );
}

/**
 * draw the wave onto the canvas
 */
function drawWave( buffers ) {
    var canvas = document.getElementById( "wavedisplay" );

    drawBuffer( canvas.width, canvas.height, canvas.getContext('2d'), buffers[0] );
}

/**
 * force the download of the recorded file
 */
function doneEncoding( blob ) {
    Recorder.forceDownload( blob, "myRecording" + ((recIndex<10)?"0":"") + recIndex + ".wav" );
    recIndex++;
}

/**
 * start recording. handles UI too.
 */
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

/**
 * i have no idea if this is even in use
 */
function convertToMono( input ) {
    var splitter = audioContext.createChannelSplitter(2);
    var merger = audioContext.createChannelMerger(2);

    input.connect( splitter );
    splitter.connect( merger, 0, 0 );
    splitter.connect( merger, 0, 1 );
    return merger;
}

/**
 * wtf is this doing?
 */
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
    		SetUiDecibels( dbValue, MaxMagnitude );
    	}
        lastCapture = Math.round(dbValue);
        lastMag = Math.round(MaxMagnitude);
    }
    
    rafID = window.requestAnimationFrame( updateAnalysers );
}

/**
 * is this even being used? mono vs stereo? who cares?
 */
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

/**
 * callback function after user successfully allows recording.
 */
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

/**
 * prompt user to allow for audio capture
 */
function initAudio(callback) {

    // find the sources
    MediaStreamTrack.getSources(function(sources){
        
        // setting audio source
        var srcId = null, 
            firstAudioInput = null, 
            sourceOutputHtml = "<h5>AUDIO SOURCE<br /><select id='audioSourceSelection'>";
        sources.forEach(function(src, arrIndex){
            console.log(src);
            if(!firstAudioInput) if(src.kind == "audio") firstAudioInput = src.id;
            if(src.label == localStorage.audioSourceLabel) srcId = src.id;

            if(src.kind == "audio")
            {
                sourceOutputHtml += "<option value='" + src.id + "'";
                if(localStorage.audioSourceLabel == (src.label || arrIndex))
                    sourceOutputHtml += " selected";
                sourceOutputHtml += ">" + (src.label || arrIndex) + "</option>";

            }
        });

        $('#home').append( sourceOutputHtml + "</select></h5>" );
        $('#audioSourceSelection').change(function(){
            localStorage.audioSourceLabel = $('#audioSourceSelection option:selected').text();
            location.reload();
        });
        
        if(!srcId) srcId = firstAudioInput;
        if(!localStorage.audioSourceLabel) 
            localStorage.audioSourceLabel = $('#audioSourceSelection option:selected').text();


        if (!navigator.getUserMedia)
            navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        if (!navigator.cancelAnimationFrame)
            navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
        if (!navigator.requestAnimationFrame)
            navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

        navigator.getUserMedia(
            {
                audio:{
                    optional:[{sourceId: srcId}]
                }
            }, 
            function OnSuccessGetUserMedia (stream) {
                console.log('got user media', stream);
                gotStream(stream);
                if(callback) callback(null, stream);

            }, 
            function OnErrorGetUserMedia(e) {
                alert('Error getting audio');
                console.log(e);
                if(callback) callback(e, null);
            }
        );

    });

}


/**
 * ## Array.prototype.map
 * polyfill from Mozilla for `Array.map`, which i love more than a plate of gourmet chocolate
 */
if (!Array.prototype.map)
{
    Array.prototype.map = function (fun /*, thisArg */) {
        "use strict";

        if (this === void 0 || this === null)
        throw new TypeError();

        var t = Object(this),
            len = t.length >>> 0;

        if (typeof fun !== "function")
        throw new TypeError();

        var res = new Array(len),
            thisArg = arguments.length >= 2 ? arguments[1] : void 0;
    
        for (var i = 0; i < len; i++)
            if (i in t) 
                res[i] = fun.call(thisArg, t[i], i, t);
    
        return res;
    };
}
