
isConflict(start Date, end Date, [])


// The main function that takes a set of intervals, merges
// overlapping intervals and prints the result
function mergeIntervals(intervals[], n)
{
    // Test if the given set has at least one interval
    if (n <= 0)
        return;
 
    // Create an empty stack of intervals
    stack = [];
 
    // sort the intervals in increasing order of start time
    intervals = intervals.sort(function(a, b) {
        return a.start < b.start;
    });
 
    // push the first interval to stack
    stack.push(intervals[0]);
 
    // Start from the next interval and merge if necessary
    for (int i = 1 ; i < n; i++)
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
 
// Driver program
function findConflict(start, end, busyTimes)
{
    var intervals = busyTimes.reduce((a,b) => (a.concat(b)));
    var n = intervals.length;
    var mergedTimes = mergeIntervals(intervals, n);
    for (var i = 0; i < mergedTimes.length; i++) {
        if (end > mergedTimes[i].start || mergedTimes[i].end > start) return stack;
    }
    return false;
}