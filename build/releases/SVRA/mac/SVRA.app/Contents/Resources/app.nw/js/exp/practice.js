CurrentExperiment = {

    isRunning: false,

    timeout: null,

    data: null,
    totalTime: 0,
    lastTime: 0,
    
    loopInterval: 5000,


    maxDuration: 30 * 1000,
    isPaused: false,

    intervalLoudest: 0,
    intervalCheck: 500,

    probabilityData: [
        [true, .25],
        [false, .75]
    ],

    weightedList: null,

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

    loopSound: function(loopTime, pauseTotal){

        //console.log("CurrentExperiment.loopSound", new Date() );

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
                CurrentExperiment.loopSound();
            }

        }, typeof loopTime == 'undefined' ? CurrentExperiment.loopInterval : loopTime);

    },


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
        CurrentExperiment.loopSound();

    },

    pause: function(){
        if(CurrentExperiment.timeout) 
        {
            clearTimeout(CurrentExperiment.timeout);
        }
        //console.log('CurrentExperiment.pause - loopSound timeout cleared', CurrentExperiment.timeout);

        CurrentExperiment.totalTime += (  (+new Date()) - CurrentExperiment.lastTime  );
        CurrentExperiment.isPaused = +new Date();

    },

    continue: function(){

        var elapsedThisRound = CurrentExperiment.isPaused - CurrentExperiment.lastTime;

        CurrentExperiment.lastTime = +new Date();

        var wasPausedTime = (+new Date()) - CurrentExperiment.isPaused;
        CurrentExperiment.isPaused = false;

        // console.log(
        //     'CONTINUE was paused for', 
        //     wasPausedTime, 'next check in', 
        //     CurrentExperiment.loopInterval - elapsedThisRound, 
        //     'ms'
        // );
        
        CurrentExperiment.loopSound(CurrentExperiment.loopInterval - elapsedThisRound, wasPausedTime);

    }
};