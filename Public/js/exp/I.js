/** ## Dependencies
 *  * weighted-list.js
 */

CurrentExperiment = {

    /** ## Settings
     */

    /**
     * The first row of data output.
     */
    recordHeader: [
        "ms since start of experiment",
        "interval value (magnitude)",
        "loudest 5th of last 19",
        "point total",
        "pause time",
        "extinction"
    ],

    /**
     * How many miliseconds you want a single interval to last.
     */
    loopInterval: 5000,

    /** How many miliseconds you want the experiment to run in a worst case scenario. */
    maxDuration: 90 * 60 * 1000,

    /** The check period to use when determining loudest dB during an interval. */
    intervalCheck: 500,

    /** Extinction must occur for this long before experiment ends. */
    quietTime: 25 * 1000,

    /** ## Private variables
     */

    /** Is the experiment running right now? */
    isRunning: false,

    /** Is the experiment paused right now? */
    isPaused: false,

    /** Timeout variable for CurrentExperiment.loop() */
    timeout: null,

    /** 
     * The in-memory cache of data for this experiment. 
     * All records get saved in localStorage, too. 
     */
    data: null,

    /** Total miliseconds elapsed since beginning of experiment. */
    totalTime: 0,

    /** Is extinction happening? */
    extinction: true,

    /** Time at which extinction began. */
    extinctionStart: 0,

    /** Total miliseoncds since extinction started. */
    extinctionTime: 0,

    /** How much louder does participant need to be before starting extinction? */
    extinctionMultiplier: 1.2,

    /** An override max for how loud the participant needs to be before starting extinction. */
    extinctionMaxMagnitude: 300,

    /** Quiet time total */
    quietTotal: 0,

    /** Timestamp in miliseconds of the last time an interval was tallied. */
    lastTime: 0,
    
    /** Loudest dB reading from current interval. */
    intervalLoudest: 0,

    /** First portion of experiment */
    loudestOverFirstPortion: 0,

    /** How many records back are used for the comparison? */
    comparisonRecordTotal: 19,

    /** When comparison records are sorted DESC, what is the index to use as a comparitor? */
    comparisonIndex: 4,

    /**
     * ## The internal probability table to be used to determine whether to do an increment.
     * .25 true
     * .75 false
     */
    probabilityData: [
        [true, 0.25],
        [false, 0.75]
    ],



    /**
     *  Main looping function, which calls itself.
     * 
     */
    loop: function(loopTime, pauseTotal){


        CurrentExperiment.timeout = setTimeout(function(){
            // var twoMinutes = 10* 1000;
            var twoMinutes = 60 * 2 * 1000,
                timeSinceLastCheck = (+new Date()) - CurrentExperiment.lastTime,
                currentIntervalLoudest = CurrentExperiment.intervalLoudest + 0;

            // reset interval loudest for the next interval
            CurrentExperiment.intervalLoudest = 0;

            CurrentExperiment.lastTime = +new Date();
            CurrentExperiment.totalTime += timeSinceLastCheck;
            if(CurrentExperiment.extinction)
            {
                CurrentExperiment.quietTotal += timeSinceLastCheck;
                CurrentExperiment.extinctionTime += timeSinceLastCheck;
            }

            console.log('New record at totalTime', 
                (CurrentExperiment.totalTime/1000), 'seconds');

            /** when applicable, loudest value of the last 19 intervals */
            var intervalValueForComparison = null,
                lastXrecords = null,
            // get a copy of the current records, except for the first one which is the header
                indexOfMagnitudeValue = 1,

                sortByLoudest = function(a, b) {
                    // always compare numbers to numbers, in case value is null
                    var a_interval = a[indexOfMagnitudeValue] || 0,
                        b_interval = b[indexOfMagnitudeValue] || 0;
                    
                    if(a_interval > b_interval) return -1;
                    if(a_interval < b_interval) return 1;
                    return 0;
                },
                currentRecs = CurrentExperiment.data.records.get().slice(1); // dont sort yet


            // What is the loudest interval value?
            if(currentRecs.length > CurrentExperiment.comparisonRecordTotal)
            {
                lastXrecords = currentRecs.slice(-CurrentExperiment.comparisonRecordTotal).sort(sortByLoudest);
                console.log('comparing against set', lastXrecords);
                var recordForComparison = lastXrecords[CurrentExperiment.comparisonIndex];
                console.log('comparing against record', recordForComparison);
                intervalValueForComparison = recordForComparison[indexOfMagnitudeValue];
            }
            console.log('Adding new record, number', currentRecs.length+1);
            // Save the data
            var newDataRec = [ 
                CurrentExperiment.totalTime, 
                currentIntervalLoudest, 
                intervalValueForComparison, 
                SCORE, 
                pauseTotal || null,
                CurrentExperiment.extinction
            ];
            CurrentExperiment.data.records.add(newDataRec);
            CurrentExperiment.data.save();
            // then update current recs
            currentRecs = CurrentExperiment.data.records.get().slice(1)

            // See if extinction is active
            if(CurrentExperiment.extinction)
            {
                console.log('CurrentExperiment.extinction is active');

                if(CurrentExperiment.totalTime >= CurrentExperiment.maxDuration)
                {
                    console.log("Ending experiment - max duration exceeded");
                    CurrentExperiment.end();
                    return;
                }

                var SILENCE = ROOM_MAG + WIGGLE_ROOM; // they get a little wiggle room
                console.log("Silence is at", SILENCE, "and loudest of last interval was", currentIntervalLoudest);
                if(SILENCE < currentIntervalLoudest)
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
                return;
            }
            // stop here if in extinction



            /**
             * Determining whether to play the sound and increment the score.
             * If two minutes have passed, follow logic for portion 2 of the experiment. Otherwise, it is portion 1 logic.
             */

            var twoMinutesHavePassed = twoMinutes <= CurrentExperiment.totalTime,
                wl = new WeightedList(CurrentExperiment.probabilityData),
                shouldPlayAndIncrement = false;

            // portion 1
            if(!twoMinutesHavePassed)
            {
                shouldPlayAndIncrement = JSON.parse(wl.peek()[0]);
                console.log("Two minutes have NOT passed, using probability. Yield is", shouldPlayAndIncrement);
            }
            // portion 2
            else{
                console.log("Two minutes have passed.");
               
                if(intervalValueForComparison < currentIntervalLoudest)
                {
                    console.log('Was louder than 5th highest of last 19. intervalValueForComparison:', intervalValueForComparison, 'is less than current:', currentIntervalLoudest);

                    shouldPlayAndIncrement = true;
                }
                // highly unlikely it will be equal, but hey what the hell
                else if(intervalValueForComparison == currentIntervalLoudest)
                {
                    console.log('Was equal to the intervalValueForComparison highest of last 19.', intervalValueForComparison, '==', currentIntervalLoudest);
                    shouldPlayAndIncrement = JSON.parse(wl.peek()[0]);
                    console.log('Probability used to determine score. Yield is', shouldPlayAndIncrement);
                }
                // if it's not getting louder, beep should not play or increment
                else{
                    console.log('Not enough louder to give a score. intervalValueForComparison:',
                        intervalValueForComparison, 'is greater than current:',
                        currentIntervalLoudest);
                }
            }

            if(shouldPlayAndIncrement)
            {
                PlayBeep();
                IncrementScore();
            }

            if(!twoMinutesHavePassed) return CurrentExperiment.loop();

            /**
             * Portion 1 is over. Everything else applies only to portion 2.
             */

            var firstPortionTotal = 0,
                firstPortionAverage = 0,
                loudnessCutoffForExinction = 0,
                loudnessHasSufficientlyIncreased = false,
                firstPortionRecs = [],
                valuesToDetermineExtinction = currentRecs
                                                .slice( -3 )
                                                .map(function(rec){
                                                    return rec[indexOfMagnitudeValue];
                                                }); // 3 values
            /**
             * Gather the records from under 2 minutes.
             */
            $.each(currentRecs, function(i, _record){
                if(_record[0] <= twoMinutes)
                {
                    firstPortionRecs.push(_record);
                    firstPortionTotal += _record[indexOfMagnitudeValue];
                }
            });

           firstPortionAverage = firstPortionTotal / firstPortionRecs.length;

            /** Set the cutoff point for switching to extinction. */
            loudnessCutoffForExinction = Math.min(
                firstPortionAverage * CurrentExperiment.extinctionMultiplier,
                CurrentExperiment.extinctionMaxMagnitude
            );

            if(currentRecs.length > 15)
            {
                var isGreater = 0;
                $.each(valuesToDetermineExtinction, function(i, _magnitude){
                    if(_magnitude > loudnessCutoffForExinction) isGreater++;
                });

                loudnessHasSufficientlyIncreased = isGreater == valuesToDetermineExtinction.length;
            }


            /**
             * Determining whether to continue the experiment if two minutes have already passed. Has loudness increased at a substantial amount enough to warrant the final phase of the experiment?
             */
            if(twoMinutesHavePassed && loudnessHasSufficientlyIncreased)
            {
                console.log("Starting Extinction because: twoMinutesHavePassed and loudnessHasSufficientlyIncreased", loudnessCutoffForExinction, 'mag to', valuesToDetermineExtinction);

                CurrentExperiment.extinction = true;
                CurrentExperiment.extinctionTime = 0;
                CurrentExperiment.quietTotal = 0;
                CurrentExperiment.extinctionStart = +new Date();
                CurrentExperiment.loop();
            }
            else if(CurrentExperiment.totalTime >= CurrentExperiment.maxDuration )
            {
                console.log("Killing experiment due to maxDuration exceeded:", CurrentExperiment.totalTime, 'is greater than max of', CurrentExperiment.maxDuration);
                CurrentExperiment.end();
            }
            else{
                console.log("Looping. Not loud enough for extinction yet. Extinction at:", loudnessCutoffForExinction, 'values are', valuesToDetermineExtinction);
                CurrentExperiment.loop();
            }

        }, typeof loopTime == 'undefined' ? CurrentExperiment.loopInterval : loopTime);

    },

    /**
     * Background looping function that keeps track of highest value during an interval.
     */
    loopIntervalCheck: function() {
        
        CurrentExperiment.intervalLoudest = Math.max(CurrentExperiment.intervalLoudest, lastMag);
        console.log(CurrentExperiment.intervalLoudest);

        if(CurrentExperiment.isRunning)
        {
            setTimeout(function(){
                CurrentExperiment.loopIntervalCheck();
            }, CurrentExperiment.intervalCheck);
        }
       
    },


    /**
     * ## Start and Stop functions
     */


    end: function(){

        if(CurrentExperiment.timeout) clearTimeout(CurrentExperiment.timeout);
        CurrentExperiment.isRunning = false;
        // give it a little bit to play the last beep
        setTimeout(function(){

            PlayEndBeep();

            EndExperiment();

            CurrentExperiment.timeout = null;

        }, 500);
        

    },

    start: function(){
        // Resets
        CurrentExperiment.isRunning = true;
        CurrentExperiment.totalTime = 0;
        CurrentExperiment.lastTime = +new Date();
        CurrentExperiment.timeout = null;
        CurrentExperiment.intervalLoudest = 0;
        CurrentExperiment.extinctionTime = 0;
        CurrentExperiment.extinctionStart = 0;
        CurrentExperiment.quietTotal = 0;
        CurrentExperiment.extinction = false;

        CurrentExperiment.data = new Experiment({
            method: "I"
        });
        
        CurrentExperiment.data.records.add(CurrentExperiment.recordHeader);
        CurrentExperiment.data.save();

        // Now Start
        CurrentExperiment.loopIntervalCheck();
        CurrentExperiment.loop();

    },

    pause: function(){
        if(CurrentExperiment.timeout) 
        {
            clearTimeout(CurrentExperiment.timeout);
        }

        CurrentExperiment.totalTime += (  (+new Date()) - CurrentExperiment.lastTime  );
        CurrentExperiment.isPaused = +new Date();

    },

    continue: function(){

        var elapsedThisRound = CurrentExperiment.isPaused - CurrentExperiment.lastTime;

        CurrentExperiment.lastTime = +new Date();

        var wasPausedTime = (+new Date()) - CurrentExperiment.isPaused;
        CurrentExperiment.isPaused = false;
        
        CurrentExperiment.loop(CurrentExperiment.loopInterval - elapsedThisRound, wasPausedTime);

    }
};