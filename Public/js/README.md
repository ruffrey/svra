# Compatibility

Runs on Chrome - beware of anything else due to the use of `AudioContext` and `localStorage` (which is a fucking string store - jeez-its Google really??)

# Globals

`client.js` is the primary application file. There are a lot of globals and scoping is ugly - whoopsie. Should have written this in a more object oriented way. Better yet, I should have used a traditional OO strongly typed OO language like C# or Java.


`$` jQuery
`CurrentExperiment`
`WeightedList` probability calculator
`drawBuffer`
`Recorder` audio recorder
`Experiment` really less an experiment and more a data record
`Phases` reusable experimental phases
`sortByLoudest` and `sortByQuietest`