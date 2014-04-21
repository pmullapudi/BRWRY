//var gpio = require('rpi-gpio');
var gpio = require('./fakerpi-gpio.js') //when testing on something other than a pi
var async = require('async');

var allowablePins = [11,12,13,15,16,18];

exports.addEquipment = function(systemjson,newPin,callback) {
	var existcheck = false;
	async.each(systemjson.equipment,function(equipment,cb){
		if (equipment.address == newPin.address) {
			existcheck = true;
		}
		cb();
	},function(err){
		if (existcheck == false) {
			if (!newPin.safeValue) {
				newPin.safeValue = 0;
			}
			if (!newPin.value) {
				newPin.value = 0;
			}
			systemjson.equipment.push(newPin)
			callback(true,systemjson)
		} else {
			callback(false)
		}
	})
}

exports.updateEquipment = function(systemjson,updateequipment,callback) {
	var changecheck = false;
	async.each(systemjson.equipment,function(equipment,cb){
		async.each(updateequipment,function(updateequip,cb2){
			if (equipment.address == updateequip.address) {
				//check to see what, if anything, changed
				if (equipment.name != updateequip.name) {
					equipment.name = updateequip.name;
					changecheck = true;
				}
				if (equipment.type != updateequip.type) {
					equipment.type = updateequip.type;
					changecheck = true;
				}
				if (equipment.location != updateequip.location) {
					equipment.location = updateequip.location;
					changecheck = true;
				}
				if (equipment.value != updateequip.value) {
					equipment.value = updateequip.value;
					changecheck = true;
				}
				if (equipment.safeValue != updateequip.safeValue) {
					equipment.safeValue = updateequip.safeValue;
					changecheck = true;
				}
			}
			cb2();
		},
		function(err){
			cb();
		})
	},function(err){
		if (changecheck == true) {
			callback(true,systemjson)
		} else {
			callback(false)
		}

	})
}

exports.removeEquipment = function(systemjson,gpioPin,callback) {
	var existcheck = false;
	async.each(systemjson.equipment,function(equipment,cb){
		if (equipment.address == gpioPin.address) {
			existcheck = true;
			for (var i = 0; i < systemjson.equipment.length; i++) {
				if (systemjson.equipment[i].address == gpioPin.address) {
					systemjson.equipment.splice(i,1);
				}
			}
		}
		cb();
	},function(err){
		if (existcheck == true) {
			callback(true,systemjson)
		} else {
			callback(false)
		}

	})
}

exports.allowablePins = function(socket) {
	socket.emit('allowablepins',{'allowablepins':allowablePins});
}

function pinStates(socket,Equipment){
	Equipment.find({}, function(err,equipment){
		socket.emit('gpiopinout',{'gpiopinout':equipment});
	});
}

exports.pinStates = function(socket,Equipment) {
	pinStates(socket,Equipment);
}

exports.logPins = function(Equipment,brew) {
	Equipment.find({}, function(err,equipment){
		brew.equipmentLog(equipment);
	});	
}

exports.devPin = function(socket,Equipment) {
	Equipment.create({
		name: 'Test Light 1',
		type: 'LED',
		address: 16,
		location: 'Development', //Description of where it is in the process
		modes: ['on','off'],
		value: 1,
		state: 1,
		date: Date(),
		pidtime: 1,
		laststate: Date(),
		safeValue: 1,
		linked: []
	});
	console.log('Created dev equipment!')
}

exports.initPins = function(socket,Equipment) {
	Equipment.find({},function (err, equipment) {
		equipment.forEach(function(gpioPin){
			gpio.setup(gpioPin.address, gpio.DIR_OUT, function(){
				gpio.write(gpioPin.address,gpioPin.value,function(err){
					if (err) console.log('Error:',err)
					console.log('Pin',gpioPin.address,'initialized and turned',gpioPin.modes[gpioPin.state]);
				})
			});
		})
	});
}

exports.togglePin = function(systemjson,gpioPin,callback) {
	var existcheck = false;
	async.each(systemjson.equipment,function(equipment,cb){
		if (equipment.address == gpioPin.address) {
			existcheck = true;
			console.log('checked = true')
			if (equipment.value == 1) {
				equipment.value = 0;
			} else {
				equipment.value = 1;
			}
			gpio.write(equipment.address,equipment.value,function(err){
				console.log('Error:',err);
				cb();
			});
		} else {
			cb();
		}
		
	},function(err){
		if (existcheck == true) {
			callback(true,systemjson)
		} else {
			callback(false)
		}
	})
}
exports.toggleAll = function(systemjson,callback) {
	async.each(systemjson.equipment,function(equipment,cb){
		gpio.write(equipment.address,equipment.safeValue,function(err){
			equipment.value = equipment.safeValue;
			cb();
		});
	},function(err){
		callback(systemjson)
	})
}
/*
exports.toggleAllPin = function(socket,Equipment) {
	//Turn all pins off
	Equipment.find({},function (err, equipment){
		equipment.forEach(function(gpioPin){
			Equipment.update({address:gpioPin.address},{value:gpioPin.safeValue,
				state:gpioPin.safeValue,date:Date(),lastState:Date()},function (err, numberAffected, raw) {
					if (err) console.log('Error:',err);
					gpio.write(gpioPin.address,gpioPin.safeValue,function(err){
						console.log('Error:',err);
					});
					//console.log('The raw response from Mongo was ', raw);
			});
		})
		pinStates(socket,Equipment);
	})
}
*/
exports.updatePin = function(socket,Equipment,gpioPin) {
	//Check if it's in the database
	Equipment.findOne({address:gpioPin.address},function (err, equipment) {
		var newValue;
		var safeValue;
		console.log('gpioPin:',gpioPin)
		if (gpioPin.value == true) {
			newValue = 1;
		} else if (gpioPin.value == false) {
			newValue = 0;
		} else {
			newValue = gpioPin.value;
		}
		if (gpioPin.safeValue == true) {
			safeValue = 1;
		} else if (gpioPin.safeValue == false) {
			safeValue = 0;
		} else {
			safeValue = gpioPin.safeValue;
		}
		if (!equipment) {
			allowablePins.forEach(function(allowablePin){
				if (allowablePin == gpioPin.address){
					Equipment.create({
						name: 'unnamed',
						type: 'LED',
						address: gpioPin.address,
						location: 'Development', //Description of where it is in the process
						modes: ['on','off'],
						value: newValue,
						state: newValue,
						date: Date(),
						pidtime: 1,
						laststate: Date(),
						safeValue: safeValue,
						linked: []
					},function(err,equipment){
						pinStates(socket,Equipment);
						gpio.setup(gpioPin.address, gpio.DIR_OUT, function(){
							gpio.write(gpioPin.address,gpioPin.value,function(err){
								if (err) console.log('Error:',err)
								console.log('Pin',equipment.address,'initialized and turned',equipment.modes[equipment.state]);
							})
						});
					});
				}
			})
		} else {
			//equipment exists
			newValue = gpioPin.value;
			Equipment.update({address:gpioPin.address},{value:newValue,safeValue:safeValue,
				state:newValue,date:Date(),lastState:Date()},function (err, numberAffected, raw) {
					if (err) console.log('Error:',err);
					gpio.write(gpioPin.address,newValue,function(err){
						console.log('Error:',err);
					});
					pinStates(socket,Equipment);
					//console.log('The raw response from Mongo was ', raw);
			});
		}
	})
}

exports.updateAllPin = function(socket,Equipment,gpioPins) {
	//Check if it's in the database
	gpioPins.forEach(function(gpioPin){
		Equipment.findOne({address:gpioPin.address},function (err, equipment) {
			var newValue;
			var safeValue;
			console.log('gpioPin:',gpioPin)
			if (gpioPin.value == true) {
				newValue = 1;
			} else if (gpioPin.value == false) {
				newValue = 0;
			} else {
				newValue = gpioPin.value;
			}
			if (gpioPin.safeValue == true) {
				safeValue = 1;
			} else if (gpioPin.safeValue == false) {
				safeValue = 0;
			} else {
				safeValue = gpioPin.safeValue;
			}
			//equipment exists
			newValue = gpioPin.value;
			Equipment.update({address:gpioPin.address},{value:newValue,safeValue:safeValue,
				state:newValue,date:Date(),lastState:Date()},function (err, numberAffected, raw) {
					if (err) console.log('Error:',err);
					gpio.write(gpioPin.address,newValue,function(err){
						console.log('Error:',err);
					});
					pinStates(socket,Equipment);
					//console.log('The raw response from Mongo was ', raw);
			});
		})
	})
}

exports.removePin = function(socket,Equipment,gpioPin) {
	//Make it safe...
	gpio.write(gpioPin.address,gpioPin.safeValue,function(err){
		if(err) console.log('Error:',err);
		console.log('Pin',gpioPin.address,'made safe.');
	});
	//remove from database:
	Equipment.remove({address:gpioPin.address}, function (err) {
		console.log('removePin err:',err);
		pinStates(socket,Equipment);
	});
}

exports.killPins = function(Equipment) {
	Equipment.find({},function (err, equipment) {
		equipment.forEach(function(gpioPin){
			gpio.write(gpioPin.address, gpioPin.safeValue);
			console.log('All pins safe.')
		})
		gpio.destroy(function() {
			console.log('All pins unexported.');
			return process.exit(0);
		})
	})
}