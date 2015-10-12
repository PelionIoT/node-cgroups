// launch a few processes, control them via cgroups
var util = require('util');
var cgroups = require('../index.js').newController();

var child_process = require('child_process');
var path = require('path');
var util = require('util');
var bozo = cgroups.newGroup("bozo");


var child = child_process.fork(path.join(__dirname,"chew-cpu.js"));

console.log("child: " + util.inspect(child));

bozo.assignProcess(child.pid,"cpu").then(function(trait) {
	console.log("SUCESS");
	trait.set_cpu_percentage_use(0.1).then(function(){
		console.log("Set CPU ok.");
	}).catch(function(err){
		console.error("Failed to set CPU");
	})
}).catch(function(err){
	console.log("FAILURE: " + util.inspect(err));
});


