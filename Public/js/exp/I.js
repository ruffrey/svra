CurrentExperiment = {
	timeout: null,
	end: function(){

    	if(CurrentExperiment.timeout) clearTimeout(self.timeout);
    },
    loopSound: function(){
    	CurrentExperiment.timeout = setTimeout(function(){
    		PlayBeep();
    		IncrementScore();
    		CurrentExperiment.loopSound();
    	}, 4000);
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