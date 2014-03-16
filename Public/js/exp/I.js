/** ## Dependencies
 *  * weighted-list.js
 */

CurrentExperiment = {

    /** ## Settings
     */

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

    /** Quiet time total */
    quietTotal: 0,

    /** Timestamp in miliseconds of the last time an interval was tallied. */
    lastTime: 0,
    
    /** Loudest dB reading from current interval. */
    intervalLoudest: 0,



    /**
     * ## The internal probability table to be used to determine whether to do an increment.
     */
    probabilityData: [
        [true, 0.25],
        [false, 0.75]
    ],



    /**
     *  Main looping function which calls itself.
     * 
     */
    loop: function(loopTime, pauseTotal){


        CurrentExperiment.timeout = setTimeout(function(){
            var timeSinceLastCheck = (+new Date()) - CurrentExperiment.lastTime;
            var currentIntervalLoudest = CurrentExperiment.intervalLoudest + 0;

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
            var intervalValue15 = null;
            // get a copy of the current records
            var currentRecs = CurrentExperiment.data.records.get().slice(0);
            var indexOfIntervalValue = 2;
            var indexOfDecibelValue = 1;

            // sorted by highest decibel
            currentRecs.sort( function(a, b) {
                // always compare numbers to numbers, in case value is null
                var a_interval = a[indexOfDecibelValue] || 0,
                    b_interval = b[indexOfDecibelValue] || 0;
                
                if(a_interval > b_interval) return -1;
                if(a_interval < b_interval) return 1;
                return 0;
            } );

            // What is the loudest interval value?
            if(currentRecs.length > 19)
            {
                var last19records = currentRecs.slice(-19);
                intervalValue15 = last19records[14][indexOfDecibelValue];
            }
            console.log('Adding new record, number', currentRecs.length+1);
            // Save the data
            var newDataRec = [ 
                CurrentExperiment.totalTime, 
                currentIntervalLoudest, 
                intervalValue15, 
                SCORE, 
                pauseTotal || null,
                CurrentExperiment.extinction
            ];
            CurrentExperiment.data.records.add(newDataRec);
            CurrentExperiment.data.save();


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

                var SILENCE = ROOM_DB + WIGGLE_ROOM; // they get a little wiggle room
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



            // reset interval loudest for the next interval
            CurrentExperiment.intervalLoudest = 0;


            // Determining whether to play the sound and increment the score
            var twoMinutesHavePassed = (10 * 1000) <= CurrentExperiment.totalTime;
            // var twoMinutesHavePassed = (60 * 1000 * 2) <= CurrentExperiment.totalTime;

            // set up
            var wl = new WeightedList(CurrentExperiment.probabilityData);
            var shouldPlayAndIncrement = false;

            if( twoMinutesHavePassed )
            {
                console.log("Two minutes have passed.");
                var _15thLoudest = currentRecs.length > 15 
                    ? currentRecs[14][indexOfDecibelValue]
                    : 0;

                // Is it louder or equal in loudness to at least 15 of the last 19?      
                if(currentRecs.length > 15)
                {
                    if(_15thLoudest < currentIntervalLoudest)
                    {
                        console.log('Was louder than 15th highest of last 19.', _15thLoudest, '<', currentIntervalLoudest);

                        shouldPlayAndIncrement = true;
                    }
                    // highly unlikely it will be equal, but hey what the hell
                    else if(_15thLoudest == currentIntervalLoudest)
                    {
                        console.log('Was equal to the 15th highest of last 19.', _15thLoudest, '==', currentIntervalLoudest);
                        shouldPlayAndIncrement = JSON.parse(wl.peek()[0]);
                        console.log('Probability used to determine score. Yield is', shouldPlayAndIncrement);
                    }
                }
                // if it's not getting louder, beep should not play or increment
                else{
                    console.log('Not enough louder to give a score.',
                        _15thLoudest, '>',
                        currentIntervalLoudest);
                }
                
            }
            else{
                shouldPlayAndIncrement = JSON.parse(wl.peek()[0]);
                console.log("Two minutes have NOT passed, using probability. Yield is", shouldPlayAndIncrement);
            }

            if(shouldPlayAndIncrement)
            {
                PlayBeep();
                IncrementScore();
            }

            var twiceOriginalLoudness = (currentRecs[currentRecs.length-1][indexOfDecibelValue]*2);

            var loudnessHasDoubled = currentRecs.length > 15
                ? twiceOriginalLoudness <= ( intervalValue15 || 0) 
                : false;
            
            // Determining whether to continue the experiment
            if(twoMinutesHavePassed && loudnessHasDoubled)
            {
                console.log("twoMinutesHavePassed and loudnessHasDoubled", twiceOriginalLoudness, 'dB to', intervalValue15, 'dB - Starting Extinction');

                CurrentExperiment.extinction = true;
                CurrentExperiment.extinctionTime = 0;
                CurrentExperiment.quietTotal = 0;
                CurrentExperiment.extinctionStart = +new Date();
            }
            else if(CurrentExperiment.totalTime >= (CurrentExperiment.maxDuration) )
            {
                console.log("Killing experiment due to maxDuration exceeded:", CurrentExperiment.totalTime, 'is greater than max of', CurrentExperiment.maxDuration);
                CurrentExperiment.end();
            }
            else{
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
        
        CurrentExperiment.data.records.add([
            "ms since start of experiment",
            "interval value (magnitude)",
            "loudest 15th of last 19",
            "point total",
            "pause time",
            "extinction"
        ]);
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