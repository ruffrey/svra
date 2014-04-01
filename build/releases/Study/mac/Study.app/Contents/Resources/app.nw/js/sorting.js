/**
 * There are some assumptions about global variables here.
 */

/**
 *
 */
function sortByLoudest(a, b) {
    // always compare numbers to numbers, in case value is null
    var a_interval = a[CurrentExperiment.indexOfMagnitudeValue] || 0,
        b_interval = b[CurrentExperiment.indexOfMagnitudeValue] || 0;
    
    if(a_interval > b_interval) return -1;
    if(a_interval < b_interval) return 1;
    return 0;
}

/**
 *
 */
function sortByQuietest(a, b) {
    // always compare numbers to numbers, in case value is null
    var a_interval = a[CurrentExperiment.indexOfMagnitudeValue] || 0,
        b_interval = b[CurrentExperiment.indexOfMagnitudeValue] || 0;
    
    if(a_interval < b_interval) return -1;
    if(a_interval > b_interval) return 1;
    return 0;
}
