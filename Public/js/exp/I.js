CurrentExperiment = {

    /** ## Settings
     */

    /**
     * How many miliseconds you want a single interval to last.
     */
    loopInterval: 5000,

    /** How many miliseconds you want the experiment to run in a worst case scenario. */
    maxDuration: 30 * 1000,

    /** The check period to use when determining loudest dB during an interval. */
    intervalCheck: 500,



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

    /** Timestamp in miliseconds of the last time an interval was tallied. */
    lastTime: 0,
    
    /** Loudest dB reading from current interval. */
    intervalLoudest: 0,



    /**
     * ## The internal probability table to be used to determine whether to do an increment.
     */
    probabilityData: [
        [true, .25],
        [false, .75]
    ],



    /**
     *  Main looping function which calls itself.
     * 
     */
    loop: function(loopTime, pauseTotal){


        CurrentExperiment.timeout = setTimeout(function(){
            
            var wl = new WeightedList(CurrentExperiment.probabilityData);
            var shouldPlayAndIncrement = JSON.parse(wl.peek()[0]);

            //console.log('Probability:', shouldPlayAndIncrement);

            if(shouldPlayAndIncrement)
            {
                PlayBeep();
                IncrementScore();
            }
            
            CurrentExperiment.totalTime+= (  (+new Date()) - CurrentExperiment.lastTime );
            CurrentExperiment.lastTime = +new Date();

            //console.log('New record at totalTime', CurrentExperiment.totalTime);

            var intervalValue = null;

            var currentRecs = CurrentExperiment.data.records.get().slice(0);
            if(currentRecs.length > 10)
            {
                intervalValue = 0;
                var last10records = currentRecs.slice(-10);
                
                last10records.forEach( function(r) {
                    var dB = r[1];
                    if(dB > intervalValue) intervalValue = dB;
                });

            }
                
            var newDataRec = [ 
                CurrentExperiment.totalTime, 
                CurrentExperiment.intervalLoudest, 
                intervalValue, 
                SCORE, 
                pauseTotal || null
            ];
            
            CurrentExperiment.data.records.add(newDataRec);
            CurrentExperiment.data.save();
            
            // reset interval loudest
            CurrentExperiment.intervalLoudest = 0;

            if(CurrentExperiment.totalTime >= (CurrentExperiment.maxDuration) )
            {
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
        
        CurrentExperiment.intervalLoudest = Math.max(CurrentExperiment.intervalLoudest, lastCapture);
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

        CurrentExperiment.data = new Experiment({
            method: "practice"
        });
        
        CurrentExperiment.data.records.add([
            "ms since start of experiment",
            "sample of current speech volume in dB",
            "interval value",
            "point total",
            "pause time"
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