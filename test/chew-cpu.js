// check cpu with a fibonacci sequence



var last = 1;
var current = 1;
var old_current;
var n = 0;
for(;;) {
	old_current = current;
	current = current + last;
	last = old_current;
	if(current > 9007199254740991) {
		last = 1;
		current = 1;
	}
	var whatev = current % 7;
	if(whatev == 0) {
//		console.log("" + n + " " + last + " was divisible by 7");
	}
	else {
//		console.log("" + n + " " + last);
//		console.log("*");
	}
	n++;
}
