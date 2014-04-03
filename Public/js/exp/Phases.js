/**
 * static object
 */
var Phases = {};

/**
 *
 */
Phases.saveExperimentState = function(pauseTotal, sortFunction) {
	var timeSinceLastCheck = (+new Date()) - CurrentExperiment.lastTime,
    	/** when applicable, loudest value of the last 19 intervals */
		lastXrecords = null,
		currentRecs;
            
    CurrentExperiment.currentIntervalLoudest = CurrentExperiment.intervalLoudest + 0;

    // reset interval loudest for the next interval
    CurrentExperiment.intervalLoudest = 0;

    CurrentExperiment.lastTime = +new Date();
    CurrentExperiment.totalTime += timeSinceLastCheck;
    if(CurrentExperiment.extinction)
    {
        CurrentExperiment.quietTotal += timeSinceLastCheck;
        CurrentExperiment.extinctionTime += timeSinceLastCheck;
    }

    console.log('New record at totalTime', (CurrentExperiment.totalTime/1000), 'seconds');

    // get a copy of the current records, except for the first one which is the header
    currentRecs = CurrentExperiment.data.records.get().slice(1); // dont sort yet


    // What is the loudest interval value?
    CurrentExperiment.intervalValueForComparison = null;
    if(currentRecs.length > CurrentExperiment.comparisonRecordTotal)
    {
        lastXrecords = currentRecs.slice(-CurrentExperiment.comparisonRecordTotal).sort(sortFunction);
        console.log('comparing against set', lastXrecords);
        var recordForComparison = lastXrecords[CurrentExperiment.comparisonIndex];
        console.log('comparing against record', recordForComparison);
        CurrentExperiment.intervalValueForComparison = recordForComparison[CurrentExperiment.indexOfMagnitudeValue];
    }
    console.log('Adding new record, number', currentRecs.length+1);
    // Save the data
    var newDataRec = [ 
        CurrentExperiment.totalTime, 
        CurrentExperiment.currentIntervalLoudest, 
        CurrentExperiment.intervalValueForComparison, 
        SCORE, 
        pauseTotal || null,
        CurrentExperiment.extinction,
        CurrentExperiment.phase || ""
    ];
    CurrentExperiment.data.records.add(newDataRec);
    CurrentExperiment.data.save();
    // then update current recs
    currentRecs = CurrentExperiment.data.records.get().slice(1);
    return currentRecs;
};

/**
 * The first two minutes.
 */
Phases.warmup = function() {
	var wl = new WeightedList(CurrentExperiment.probabilityData),
	shouldPlayAndIncrement = JSON.parse(wl.peek()[0]);

	console.log("Two minutes have NOT passed, using probability. Yield is", shouldPlayAndIncrement);
	if(shouldPlayAndIncrement)
    {
        PlayBeep();
        IncrementScore();
    }

};

/**
 *
 */
Phases.calculateWarmupAverage = function(currentRecs) {
	var firstPortionTotal = 0,
	    firstPortionAverage = 0,
	    firstPortionRecs = []; // 3 values
	/**
	 * Gather the records from under 2 minutes.
	 */
	$.each(currentRecs, function(i, _record){
	    if(_record[0] <= twoMinutes)
	    {
	        firstPortionRecs.push(_record);
	        firstPortionTotal += _record[CurrentExperiment.indexOfMagnitudeValue];
	    }
	});

	firstPortionAverage = firstPortionTotal / firstPortionRecs.length;
	
	return firstPortionAverage;

};

/**
 *
 */
Phases.checkGettingLouderAndScore = function() {
	console.log("Two minutes have passed.");
	var wl = new WeightedList(CurrentExperiment.probabilityData),
		shouldPlayAndIncrement = false;
    if(CurrentExperiment.intervalValueForComparison < CurrentExperiment.currentIntervalLoudest)
    {
        console.log('Was louder than 5th highest of last 19. intervalValueForComparison:', CurrentExperiment.intervalValueForComparison, 'is less than current:', CurrentExperiment.currentIntervalLoudest);

        shouldPlayAndIncrement = true;
    }
    // highly unlikely it will be equal, but hey what the hell
    else if(CurrentExperiment.intervalValueForComparison == CurrentExperiment.currentIntervalLoudest)
    {
        console.log('Was equal to the intervalValueForComparison highest of last 19.', CurrentExperiment.intervalValueForComparison, '==', CurrentExperiment.currentIntervalLoudest);
        shouldPlayAndIncrement = JSON.parse(wl.peek()[0]);
        console.log('Probability used to determine score. Yield is', shouldPlayAndIncrement);
    }
    // if it's not getting louder, beep should not play or increment
    else{
        console.log('Not enough louder to give a score. intervalValueForComparison:',
            CurrentExperiment.intervalValueForComparison, 'is greater than current:',
            CurrentExperiment.currentIntervalLoudest);
    }

    if(shouldPlayAndIncrement)
    {
        PlayBeep();
        IncrementScore();
        return true;
    }
    return false;
};


/**
 *
 */
Phases.checkGettingQuieterAndScore = function() {
	console.log("Two minutes have passed.");
   	var shouldPlayAndIncrement = false,
   		wl = new WeightedList(CurrentExperiment.probabilityData);

	if(CurrentExperiment.intervalValueForComparison > CurrentExperiment.currentIntervalLoudest)
    {
        console.log('Was quieter than 5th highest of last 19. intervalValueForComparison:', CurrentExperiment.intervalValueForComparison, 'is greater than current:', CurrentExperiment.currentIntervalLoudest);

        shouldPlayAndIncrement = true;
    }
    else if(CurrentExperiment.intervalValueForComparison == CurrentExperiment.currentIntervalLoudest)
    {
        console.log('Was equal to the intervalValueForComparison highest of last 19.', CurrentExperiment.intervalValueForComparison, '==', CurrentExperiment.currentIntervalLoudest);
        shouldPlayAndIncrement = JSON.parse(wl.peek()[0]);
        console.log('Probability used to determine score. Yield is', shouldPlayAndIncrement);
    }
    // if it's not quiet, beep should not play or increment
    else{
        console.log('Not enough quieter to give a score. intervalValueForComparison:',
            CurrentExperiment.intervalValueForComparison, 'is less than current:',
            CurrentExperiment.currentIntervalLoudest);
    }

    if(shouldPlayAndIncrement)
    {
        PlayBeep();
        IncrementScore();
        return true;
    }
    return false;

};


/**
 * @returns Boolean
 */
Phases.hasLoudnessDecreased = function(currentRecs) {
	var loudnessCutoffForExinction = 0,
        loudnessHasSufficientlyDecreased = false,

        valuesToDetermineExtinction = currentRecs
							            .slice( -3 )
							            .map(function(rec){
							                return rec[CurrentExperiment.indexOfMagnitudeValue];
						            	}),

        warmupAverage = Phases.calculateWarmupAverage(currentRecs),

		/** Set the cutoff point for switching to extinction. */
        loudnessCutoffForExinction = Math.max(
                warmupAverage * CurrentExperiment.extinctionMultiplier,
                CurrentExperiment.extinctionMaxMagnitude
        );

    var isLess = 0;
    $.each(valuesToDetermineExtinction, function(i, _magnitude){
        if(_magnitude < loudnessCutoffForExinction) isLess++;
    });
    console.log('loudnessCutoffForExinction is ', loudnessCutoffForExinction);

    loudnessHasSufficientlyDecreased = isLess == valuesToDetermineExtinction.length;

    return loudnessHasSufficientlyDecreased;
};

/**
 * @returns Boolean
 */
Phases.hasLoudnessIncreased = function(currentRecs) {
	var loudnessCutoffForExinction = 0,
        loudnessHasSufficientlyIncreased = false,

        valuesToDetermineExtinction = currentRecs
							            .slice( -3 )
							            .map(function(rec){
							                return rec[CurrentExperiment.indexOfMagnitudeValue];
						            	}),

        warmupAverage = Phases.calculateWarmupAverage(currentRecs),

		/** Set the cutoff point for switching to extinction. */
        loudnessCutoffForExinction = Math.min(
                warmupAverage * CurrentExperiment.extinctionMultiplier,
                CurrentExperiment.extinctionMaxMagnitude
        );

    var isGreater = 0;
    $.each(valuesToDetermineExtinction, function(i, _magnitude){
        if(_magnitude > loudnessCutoffForExinction) isGreater++;
    });
    console.log('loudnessCutoffForExinction is ', loudnessCutoffForExinction);

    loudnessHasSufficientlyIncreased = isGreater == valuesToDetermineExtinction.length;

    return loudnessHasSufficientlyIncreased;
};


/**
 * Tests whether extinction is ready.
 * @returns Boolean
 */
Phases.extinctionReady = function(twoMinutesHavePassed, boolReady) {
	if(twoMinutesHavePassed && boolReady)
    {
        return true;
    }
    else if(CurrentExperiment.totalTime >= CurrentExperiment.maxDuration )
    {
        console.log("Killing experiment due to maxDuration exceeded:", CurrentExperiment.totalTime, 'is greater than max of', CurrentExperiment.maxDuration);
        CurrentExperiment.end();
        return;
    }
    else{
        return false;
    }
};

Phases.beginExtinction = function() {
	CurrentExperiment.extinction = true;
    CurrentExperiment.extinctionTime = 0;
    CurrentExperiment.quietTotal = 0;
    CurrentExperiment.extinctionStart = +new Date();
    CurrentExperiment.loop();
};


/**
 * The extinction portion of the experiment.
 */
Phases.extinction = function() {
	console.log('CurrentExperiment.extinction is active');

    if(CurrentExperiment.totalTime >= CurrentExperiment.maxDuration)
    {
        console.log("Ending experiment - max duration exceeded");
        CurrentExperiment.end();
        return;
    }

    var SILENCE = ROOM_MAG + WIGGLE_ROOM; // they get a little wiggle room
    console.log("Silence is at", SILENCE, "and loudest of last interval was", CurrentExperiment.currentIntervalLoudest);
    if(SILENCE < CurrentExperiment.currentIntervalLoudest)
    {
        console.log("Too loud, resetting quietTotal");
        // if they have not been quiet, reset their quiet time counter
        CurrentExperiment.quietTotal = 0;
        CurrentExperiment.loop();
        return;
    }
    // They have been quiet
    console.log("Quiet total time is at", CurrentExperiment.quietTotal);

    // have they been quiet long enough?
    if(CurrentExperiment.quietTotal >= CurrentExperiment.quietTime)
    {
        console.log("Ending because they were quiet for long enough");
        CurrentExperiment.end();
        return;
    }
    // if not, fall through to loop()

    CurrentExperiment.loop();
};
