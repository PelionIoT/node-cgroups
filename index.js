// node-cgroups
//
//

var fs = require('fs');
var util = require('util');
var path = require('path');
var pseudoFS = require('node-pseudofs');
var orderedTable = require('./orderedTable.js');
var Promise = require('es6-promise').Promise;

/**
 * 
On Ubuntu systems, the cgroups mounts look like this...

cgroup on /sys/fs/cgroup/cpuset type cgroup (rw,relatime,cpuset)
cgroup on /sys/fs/cgroup/cpu type cgroup (rw,relatime,cpu)
cgroup on /sys/fs/cgroup/cpuacct type cgroup (rw,relatime,cpuacct)
cgroup on /sys/fs/cgroup/memory type cgroup (rw,relatime,memory)
cgroup on /sys/fs/cgroup/devices type cgroup (rw,relatime,devices)
cgroup on /sys/fs/cgroup/freezer type cgroup (rw,relatime,freezer)
cgroup on /sys/fs/cgroup/blkio type cgroup (rw,relatime,blkio)
cgroup on /sys/fs/cgroup/perf_event type cgroup (rw,relatime,perf_event)
cgroup on /sys/fs/cgroup/hugetlb type cgroup (rw,relatime,hugetlb)

 */


var MAPS = {
	blkio : 'blkio_fs',
	cpu : 'cpu_fs',
	cpuacct : 'cpuacct_fs',
	cpuset: 'cpuset_fs',
	devices: 'device_fs',
	freezer: 'freezer_fs',
	memory: 'memory_fs',
	hugetlb: 'hugetlb_fs',
	perf_event: 'perf_event_fs',
	net_cls: 'net_cls_fs',
	net_prio: 'net_prio_fs',
	ns: 'ns_fs'
}

var default_opts = {
	cpuset_fs: "/sys/fs/cgroup/cpuset",
	cpu_fs: "/sys/fs/cgroup/cpu",
	cpuacct_fs: "/sys/fs/cgroup/cpuacct",
	memory_fs: "/sys/fs/cgroup/memory",
	device_fs: "/sys/fs/cgroup/devices",
	freezer_fs: "/sys/fs/cgroup/freezer",
	blkio_fs: "/sys/fs/cgroup/blkio",
	perf_event_fs: "/sys/fs/cgroup/perf_event",
	hugetlb_fs: "/sys/fs/cgroup/hugetlb",
	log : {
		dbg : function() {},
		err : console.error
	}
};



var log = {
	debug: function() {
		console.log.apply(undefined,arguments);
	},
	error: function() {
		console.error.apply(undefined,arguments);
	}
}

var cgroup_controller = function(opts) {
	
	this.groups = {}; // path to object map

	if(opts) {
		this.Opts = opts;
		var keyz = Object.keys(default_opts);
		for(var n=0;n<keyz.length;n++) {
			if(this.Opts[keyz[n]] === undefined) {
				this.Opts[keyz[n]] = default_opts[keyz[n]];
			}
		}
		if(this.Opts.dbg) {
			log.debug = this.Opts.dbg;
		}
		if(this.Opts.err) {
			log.error = this.Opts.err;
		}
	}
}


cgroup_controller.prototype.groups = null;

cgroup_controller.prototype.Opts = default_opts;




/**
 * create a new Linux kernel cgroup 
 * @param  {[type]} name [description]
 * @return {[type]}        [description]
 */
cgroup_controller.prototype.newGroup = function(name) {
	// make new root path name
	// 
	if(this.groups[name]) {

	} else {
		this.groups[name] = new cgroup(name,this);
	}
	return this.groups[name];
}

cgroup_controller.prototype.rmGroup = function() {
	// remove path
}

cgroup_controller.prototype.modifyTraits = function(name,traits) {

}


var cg_trait = function(id,owner,base_path) {

	if(!id || !owner || !base_path) {
		throw new Error("Invalid call of cstor for cgroup_trait");
	};
	this.id = id;
	this.base_path = base_path;
	this.owner = owner;
}

// CPU (CIFS) scheduling   ... CIFS (Config Fair Group Scheduler) is the typical default schduler for the kernel. 
// more here: https://www.kernel.org/doc/Documentation/scheduler/sched-bwc.txt

var cpu_CIFS_trait = function(id,owner,base_path) {
	cg_trait.apply(this,arguments);
}

util.inherits(cpu_CIFS_trait,cg_trait);

cpu_CIFS_trait.prototype.set_cpu_percentage_use = function(percent,period_us) {
	var cfs_period_us_path = path.join(this.base_path,'cpu.cfs_period_us');
	var cfs_quota_us_path = path.join(this.base_path,'cpu.cfs_quota_us');	
	var self = this;
	if(!percent || percent < 0 || percent > 1) {
		throw new TypeError("Invalid percent value.",__filename,149);
	}
	if(!period_us || typeof period_us != 'number' || period_us < 100) {
		period_us = 1000000;
	}
	var quota_us = Math.floor(period_us * percent);
	return new Promise(function(resolve, reject) {
		pseudoFS.writePseudo(cfs_period_us_path,""+period_us, function(err,data){
			if(!err) {
				pseudoFS.writePseudo(cfs_quota_us_path,""+quota_us,function(err,data) {
					if(!err) {
						resolve();
					} else {
						reject("Error in accessing cgroup: " + util.inspect(err));
					}
				});
			} else {
				reject("Error in accessing cgroup: " + util.inspect(err));
			}
		});
	});
}




var cgroup = function(path,controller) {
	this.paths = {};

	this.groups = {};

	if(path) this.path = path;
	else throw new Error();

	if(controller) this.controller = controller; 
	else throw new Error();

	this.cgroup_paths = {}; // tracks the path's for this 'cgroup'
	                        // in some cases this may just be one path, in others it may be multiple paths
	                        // as with Ubuntu's default setup
	                        // 
	                        // 
	this.cgroup_traits = {};
}


cgroup.prototype.build_path = function(trait,cgroup_name) {
	var fsname = MAPS[trait];  // find what internal name fot this trait is
	if(fsname) {
		if(this.controller.Opts[fsname]) {
			return path.join(this.controller.Opts[fsname],cgroup_name);
		} else {
			throw new Error("node-cgroups doesn't have knowledge of this trait '" + trait + "' on this system");
		}
	} else {
		throw new Error("Ouch. Don't have a trait mapping for " + trait + " in node-cgroups");
	}
}

cgroup.prototype.path = null;
cgroup.prototype.controller = null;
cgroup.prototype.groups = null;

cgroup.prototype.cgroup_paths = null;


cgroup.prototype._get_trait = function(cat) {
	var ret = this.cgroup_traits[cat];
	if(!ret) {
		var trait_path = this.build_path(cat,this.path);
		switch(cat) {
			case "cpu": 
				ret = this.cgroup_traits[cat] = new cpu_CIFS_trait("cpu",this,trait_path);
			break;

		}
	}
	return ret;
}

cgroup.prototype.getTrait = function(trait) {
	var self = this;
	return new Promise(function(resolve, reject) {
		var fsname = MAPS[trait];  // find what internal name fot this trait is
		if(!fsname) {
			reject("No trait in mapping for trait: " + trait);
			return;
		}
		if(!self.controller.Opts[fsname]) {
			reject("Missing system specific mapping for trait: " + trait);
			return;			
		}
		resolve(self._get_trait(trait));
	});
}

/**
 * Assign a process to the cgroup
 * @param  {[type]} pid   [description]
 * @param  {[type]} trait [description]
 * @return {Promise}       A Promise which resolves if the assignment is made correctly
 */
cgroup.prototype.assignProcess = function(pid,trait) {
	var self = this;
	return new Promise(function(resolve, reject) {
		if(typeof pid !== 'number' || typeof trait !== 'string') {
			reject(new Error("invalid parameters"));
			return;
		}
		var fsname = MAPS[trait];  // find what internal name fot this trait is
		if(!fsname) {
			reject("No trait in mapping for: " + trait);
			return;
		}
		if(!self.controller.Opts[fsname]) {
			reject("Missing system specific mapping for trait: " + trait);
			return;			
		}
		var trait_path = self.build_path(trait,self.path);
		log.debug("assignProcess: " + pid + " path: " + trait_path);	
		if(fs.stat(trait_path, function(err,stats) {
			log.debug('arguments fs.stat.cb: ' + util.inspect(arguments));
			if(!err) {
				if(stats.isDirectory()) {

					log.debug("echo " + pid + " > " + path.join(trait_path,'tasks'));
					pseudoFS.writePseudo(path.join(trait_path,'tasks'),""+pid,function(err) {
						if(!err) {
							resolve(self._get_trait(trait));
						} else {
							reject(err);
						}			
					});
				} else {
					reject(new Error("Not a valid path / directory: " + trait_path));
				}
			} else {
				log.debug("error: " + util.inspect(err));
				if(err.code == 'ENOENT') {
					log.debug("mkdir:",trait_path);
					fs.mkdir(trait_path,function(err2){
						if(err2) {
							log.error("Error on mkdir in cgroup: ", err2);
							reject(err2);
						} else {
							// TODO assign PID
							log.debug("echo " + pid + " > " + path.join(trait_path,'tasks'));
							pseudoFS.writePseudo(path.join(trait_path,'tasks'),""+pid,function(err) {
								if(!err) {
									resolve(self._get_trait(trait));
								} else {
									reject(err);
								}			
							});
						}
					});
				} else {
					reject(err);
				}
			}
		})) {

		}
	});
}

// not sure how to do this one...
// cgroup.prototype.removeProcess = function() {
//
// }



module.exports = {
	newController: function() {
		return new cgroup_controller();
	}
};

