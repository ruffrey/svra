CurrentExperiment = {
	timeout: null,

    data: null,
    totalTime: 0,
    lastTime: +new Date(),

    loopSound: function(){
    	CurrentExperiment.timeout = setTimeout(function(){
    		CurrentExperiment.totalTime+= (  (+new Date()) - lastTime  );
    		CurrentExperiment.lastTime = +new Date();

    		if(totalTime >= (15 * 1000) ) return CurrentExperiment.end();

    		PlayBeep();
    		IncrementScore();
    		CurrentExperiment.loopSound();
    	}, 5000);
    },


	end: function(){

    	if(CurrentExperiment.timeout) clearTimeout(self.timeout);
    	$('#exp-modal').modal('hide');

    },

    start: function(){
    	CurrentExperiment.loopSound();
    },

    pause: function(){
    	if(CurrentExperiment.timeout) clearTimeout(CurrentExperiment.timeout);
    },

    continue :function(){
    	CurrentExperiment.loopSound();

    }
};