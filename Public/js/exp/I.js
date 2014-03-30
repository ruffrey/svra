/** 
 * # Experiment I
 * ## Dependencies
 * weighted-list.js
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
        "5th of 19",
        "point total",
        "pause time",
        "extinction"
    ],

    /**
     * How many miliseconds you want a single interval to last.
     */
    loopInterval: 5000,

    /** 
     * How many miliseconds you want the experiment to run in a worst case scenario. 
     */
    maxDuration: 90 * 60 * 1000,

    /** 
     * The check period to use when determining loudest dB during an interval. 
     */
    intervalCheck: 500,

    /** 
     * Extinction must occur for this long before experiment ends. 
     */
    quietTime: 15 * 1000,

    /** 
     * How many records back are used for the comparison? 
     */
    comparisonRecordTotal: 19,

    /** 
     * When comparison records are sorted DESC, what is the index to use as a comparitor? 
     */
    comparisonIndex: 4,

    /**
     * Where is the magnitude value stored for one of this experiment's records?
     */
    indexOfMagnitudeValue: 1,

    /** 
     * How much louder does participant need to be before starting extinction? 
     */
    extinctionMultiplier: 1.5,

    /** 
     * An override max for how loud the participant needs to be before starting extinction. 
     */
    extinctionMaxMagnitude: 250,
    

    /** 
     * ## Private variables
     */

    /** 
     * Is the experiment running right now? 
     */
    isRunning: false,

    /** Is the experiment paused right now? */
    isPaused: false,

    /** 
     * Timeout variable for CurrentExperiment.loop() 
     */
    timeout: null,

    /** 
     * The in-memory cache of data for this experiment. 
     * All records get saved in localStorage, too. 
     */
    data: null,

    /** 
     * Total miliseconds elapsed since beginning of experiment. 
     */
    totalTime: 0,

    /** 
     * Is extinction happening? 
     */
    extinction: true,

    /** 
     * Time at which extinction began. 
     */
    extinctionStart: 0,

    /** 
     * Total miliseoncds since extinction started. 
     */
    extinctionTime: 0,

    /** 
     * Quiet time total 
     */
    quietTotal: 0,

    /** 
     * Timestamp in miliseconds of the last time an interval was tallied. 
     */
    lastTime: 0,
    
    /** 
     * Loudest dB reading from current interval. 
     */
    intervalLoudest: 0,

    /** 
     * First portion of experiment 
     */
    loudestOverFirstPortion: 0,

    

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

            var currentRecs = Phases.saveExperimentState(pauseTotal || null, sortByLoudest);

            // See if extinction is active
            if(CurrentExperiment.extinction)
            {
                return Phases.extinction();
            }
            // stop here if in extinction


            /**
             * Determining whether to play the sound and increment the score.
             * If two minutes have passed, follow logic for portion 2 of the experiment. Otherwise, it is portion 1 logic.
             */

            var twoMinutesHavePassed = twoMinutes <= CurrentExperiment.totalTime;


            if(!twoMinutesHavePassed)
            {
                Phases.warmup();
                return CurrentExperiment.loop(); 
            }
            // done here


            Phases.checkGettingLouderAndScore();

            /**
             * Determining whether to continue the experiment if two minutes have already passed. Has loudness increased at a substantial amount enough to warrant the final phase of the experiment?
             */
            var metGoal = Phases.hasLoudnessIncreased(currentRecs);

            var extinctionIsReady = Phases.extinctionReady(twoMinutesHavePassed, metGoal);
            if(extinctionIsReady === true)
            {
                console.log("Starting Extinction because: twoMinutesHavePassed and boolReady.");
                Phases.beginExtinction();
            }
            else if(extinctionIsReady === false)
            {
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