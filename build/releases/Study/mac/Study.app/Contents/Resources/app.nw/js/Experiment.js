var __LocalStorageItemName = "experiments";
// using localStorage to store the records.
// the whole thing is an Array of Experiments as JSON.
if(!localStorage[__LocalStorageItemName]) localStorage[__LocalStorageItemName] = JSON.stringify([]);


// static
var store = {

    // @returns number - the new index
    addExperiment: function (exp) {
        var unwoundRecords = JSON.parse(localStorage[__LocalStorageItemName]);
        var newIndex = unwoundRecords.length;
        exp.storageIndex = newIndex;
        unwoundRecords.push(exp);
        localStorage[__LocalStorageItemName] = JSON.stringify(unwoundRecords);
        return newIndex;
    },

    // @returns the removed record with saved properties stripped
    removeExperiment: function (ix) {
        var unwoundRecords = JSON.parse(localStorage[__LocalStorageItemName]);
        var removed = unwoundRecords.splice(ix, 1);

        var clearedRecs = unwoundRecords.map(function(r, ix) {
            //r = JSON.parse(r);
            r.storageIndex = ix;
            return r;
        });

        localStorage[__LocalStorageItemName] = JSON.stringify(clearedRecs);
        return removed;
    },

    // @returns void
    updateExperiment: function(exp) {
        var unwoundRecords = JSON.parse(localStorage[__LocalStorageItemName]);

        unwoundRecords[exp.storageIndex] = exp;

        localStorage[__LocalStorageItemName] = JSON.stringify(unwoundRecords);
    },

    getExperiments: function(arrIndexes) {
        var recs = JSON.parse( localStorage[__LocalStorageItemName] );

        var ret = [];

        if(arrIndexes instanceof Array)
        {
            arrIndexes.forEach(function(ix) {
                var rec = recs[ix];
                if(typeof rec == 'string') rec = JSON.parse(rec);

                ret.push( new Experiment(rec) );
            });
        }
        else if(typeof arrIndexes == 'number')
        {
            var rec = recs[arrIndexes];
            if(typeof rec == 'string') return new Experiment(JSON.parse(rec));

            return new Experiment(rec);
        }
        else if(!arrIndexes) {
            ret = recs.map(function(rec) {
                if(typeof rec == 'string') return new Experiment(JSON.parse(rec));

                return new Experiment(rec);
            });
        }
        else{
            throw new Error("What the hell did you try to do?");
        }

        return ret;
    },

    clearExperiments: function() {
        localStorage[__LocalStorageItemName] = JSON.stringify([]);
    }

};


// @class Experiment
function Experiment(props) {


    /* Private - properties */
    var _method = null;
    var _created = new Date();
    var _modified = new Date();
    var _records = [];
    var _storageIndex = null;

    /* Private - indicators */
    var _isSaved = false;
    var _isModified = false;

    var allowedMethods = ["practice", "I","II","III","IV"];


    /* Public methods */
    // there are no public properties

    this.isSaved = function() {
        return _isSaved;
    };
    this.isModified = function() {
        return _isModified;
    }


    this.storageIndex = function(v) {
        if(typeof v != 'undefined') 
        {
            if(typeof v != 'number')
            {
                throw new Error("Invalid storageIndex, must be number");
            }
            _storageIndex = v;
            _isModified = true;
        }
        return _storageIndex;
    };

    this.method = function(v) {
        if(v) 
        {
            if(allowedMethods.indexOf(v) == -1)
            {
                throw new Error("Invalid method, only allows " + allowedMethods);
            }
            _method = v;
            _isModified = true;
        }
        return _method;
    };
    this.created = function(v) {
        if(v) 
        {
            if(!(v instanceof Date) )
            {
                v = new Date(v);
            }
            _created = v;
            _isModified = true;
        }
        return _created;
    };
    this.modified = function(v) {
        if(v) 
        {
            if(!(v instanceof Date) )
            {
                v = new Date(v);
            }
            _modified = v;
            _isModified = true;
        }
        return _modified;
    };

    this.records = {
        get: function(ix) { 
            if(ix || ix === 0) return _records[v];
            
            return _records 
        },
        add: function(v) { _records.push(v) },
        remove: function(ix) { _records.splice(ix, 1) },
        reset: function(v) { _records = v instanceof Array ? v : [] }
    };

    this.save = function() {
        var objToSave = {
            created: _created,
            modified: _modified,
            records: _records,
            method: _method,
            storageIndex: _storageIndex
        };

        // save a new one
        if(_storageIndex === null)
        {
            _storageIndex = store.addExperiment(objToSave);
        }
        else{
            store.updateExperiment(objToSave);
        }

        _isModified = false;
        _isSaved = true;
    };

    this.remove = function() {
        store.removeExperiment(_storageIndex);
        this = null;
    };

    if(props)
    {
        // set all of the properties
        for(var p in props) 
        {
            if(p == "records")
            {
                if(typeof(props[p]) == 'string')
                {
                    _records = JSON.parse(props[p]);
                }
                else _records = props[p];
            }
            else this[p](props[p]);
        }
        if(typeof props.storageIndex == 'number')
        {
            _isSaved = true;
        }
    }
    
    return this;
};

