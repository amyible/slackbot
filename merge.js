
// The main function that takes a set of intervals, merges
// overlapping intervals and prints the result
function mergeIntervals(intervals, n)
{
    // Test if the given set has at least one interval
    if (n <= 0)
        return;
 
    // Create an empty stack of intervals
    stack = [];
 
    // sort the intervals in increasing order of start time
    intervals = intervals.sort(function(a, b) {
        var dateA = new Date(a.start);
        var dateB = new Date(b.start);
        return dateA.getTime() < dateB.getTime();
    });
    console.log("sortedIntervals", intervals);
 
    // push the first interval to stack
    stack.push(intervals[0]);
 
    // Start from the next interval and merge if necessary
    for (var i = 1 ; i < n; i++)
    {
        // get interval from stack top
        var top = stack[stack.length - 1];
 
        // if current interval is not overlapping with stack top,
        // push it to the stack
        if (top.end < intervals[i].start)
            stack.push(intervals[i]);
 
        // Otherwise update the ending time of top if ending of current
        // interval is more
        else if (top.end < intervals[i].end)
        {
            top.end = intervals[i].end;
            stack.pop();
            stack.push(top);
        }
    }
 
    return stack;
}
 
function findConflict(start, end, busyTimes)
{   
    var startTime = start.getTime();
    var endTime = end.getTime();
    if (busyTimes.length === 1 && busyTimes[0] === null) return false;
    var intervals = busyTimes.reduce((a,b) => {
        if (a === null) a = [];
        if (b === null) b = [];
        return a.concat(b);
    });
    if (busyTimes.length === 1) intervals = busyTimes[0];
    console.log("intervals", intervals)
    var n = intervals.length;
    var mergedTimes = mergeIntervals(intervals, n);
    console.log("mergedTimes", mergedTimes);
    for (var i = 0; i < mergedTimes.length; i++) {
        var startBusy = new Date(mergedTimes[i].start);
        var endBusy = new Date(mergedTimes[i].end);
        if (endTime > startBusy || startTime < endBusy || startBusy === startTime || endBusy === endTime) return stack;
    }
    return false;
}

function suggestTimes(stack) {
    var suggestions = [];
    stack.map(item => ({start: new Date(item.start), end: new Date(item.end)}));
    var latestSoFar = 0;
    for (var i in stack) {
        latestSoFar = Math.max(latestSoFar.getTime(), stack[i].end.getTime());
        if (stack[i+1].start > latestSoFar) suggestions.push({start: latestSoFar, end: stack[i+1].start})
    }
    var days = [];
    var finals = [];
    var current = suggestions[0];
    for (var i = 1; i < suggestions.length; i++) {
        if (suggestions[i].getDay() !== current) days = [];
        var startHour = suggestions[i].start.getHours();
        var endHour = suggestions[i].end.getHours();
        var dif = endHour - startHour;
        for (var j = 0; j < dif; j++) {
            days.push({start: suggestions[i].start.setHours(startHour + j), end: suggestions[i].start.setHours(startHour + j + 1)});
            if (days.length === 3) break;
        }
        finals.concat(days);
    }
    return finals.slice(0, 10);
}

module.exports = {
    findConflict
}