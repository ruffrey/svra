CurrentExperiment = {
    timeout: null,

    data: null,
    totalTime: 0,
    lastTime: +new Date(),
    loopInterval: 5000,
    maxDuration: 30 * 1000,
    isPaused: false,

    loopSound: function(loopTime, pauseTotal){

        CurrentExperiment.timeout = setTimeout(function(){
            
            
            
            if(!CurrentExperiment.isPaused)
            {
                PlayBeep();
                IncrementScore();
            }

            CurrentExperiment.totalTime+= (  (+new Date()) - CurrentExperiment.lastTime  );
            CurrentExperiment.lastTime = +new Date();

            var intervalValue = null;

            if(CurrentExperiment.data.records.get().length >= 10)
            {
                intervalValue = 0;
                CurrentExperiment.data.records.get().forEach( function(r) {
                    var dB = r[1];
                    if(db > intervalValue) intervalValue = db;
                });

            }
                
            var newDataRec = [ CurrentExperiment.totalTime, lastCapture, intervalValue, SCORE, pauseTotal || null];
            
            CurrentExperiment.data.records.add(newDataRec);
            CurrentExperiment.data.save();
        

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

        if(CurrentExperiment.timeout) clearTimeout(self.timeout);

        // give it a little bit to play the last beep
        setTimeout(function(){

            PlayEndBeep();

            EndExperiment();

        }, 500);
        

    },

    start: function(){
        CurrentExperiment.loopSound();
        CurrentExperiment.data = new Experiment({
            method: "practice"
        });
        CurrentExperiment.data.records.add([
            "ms since start of experiment",
            "sample of current speech volume in dB",
            "interval value",
            "point total",
            "pause"
        ]);
        CurrentExperiment.data.save();
    },

    pause: function(){
        if(CurrentExperiment.timeout) clearTimeout(CurrentExperiment.timeout);
        CurrentExperiment.totalTime += (  (+new Date()) - CurrentExperiment.lastTime  );
        CurrentExperiment.isPaused = +new Date();
    },

    continue: function(){

        CurrentExperiment.lastTime = +new Date();

        var elapsed = CurrentExperiment.totalTime % 5000;
        var wasPausedTime = (+new Date()) - CurrentExperiment.isPaused;
        CurrentExperiment.isPaused = false;
        CurrentExperiment.loopSound(CurrentExperiment.loopInterval - elapsed, wasPausedTime);
    }
};