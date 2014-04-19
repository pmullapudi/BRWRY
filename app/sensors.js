//var sense = require('ds18b20');
var sense = require('./fakeds18b20.js'); //when testing on something other than a pi
var async = require('async');

exports.checkUpdate = function(systemjson,updaterequest,callback) {
	if (systemjson.sensors.length == 0) {
		async.each(updaterequest.sensors,function(updatesensor,cb){
			systemjson.sensors.push({sensoraddress:updatesensor.sensoraddress,
				sensorname:updatesensor.sensorname,
				sensorloc:updatesensor.sensorloc,
				sensorstatus:updatesensor.sensorstatus,
				sensorcalibration:updatesensor.sensorcalibration,
				sensorlastchange:Date()
			})
			cb();
		},function(err){
			if(err) {
				// One of the iterations produced an error.
				// All processing will now stop.
				console.log('An id failed to process');
			} else {
				console.log('All ids have been processed successfully');
				callback(true,systemjson);
			}
		})
	} else {
		//sensors are already in the list (which they should be)
		var changeexist = false;
		async.each(updaterequest.sensors,function(updatesensor,updatecb){
			var sensorexist = false;
			var detailchange = false;
			async.each(systemjson.sensors,function(systemsensor,cb){
				if (systemsensor.sensoraddress == updatesensor.sensoraddress) {
					sensorexist = true;
					async.parallel([
						function(pcallback){
							if (systemsensor.sensorname == updatesensor.sensorname) {
								pcallback(null);
							} else {
								systemsensor.sensorname = updatesensor.sensorname;
								detailchange = true;
								pcallback(null);
							}
						},
						function(pcallback){
							if (systemsensor.sensorloc == updatesensor.sensorloc) {
								pcallback(null);
							} else {
								systemsensor.sensorloc = updatesensor.sensorloc;
								detailchange = true;
								pcallback(null);
							}
						},
						function(pcallback){
							if (systemsensor.sensorstatus == updatesensor.sensorstatus) {
								pcallback(null);
							} else {
								systemsensor.sensorstatus = updatesensor.sensorstatus;
								detailchange = true;
								pcallback(null);
							}
						},
						function(pcallback){
							if (systemsensor.sensorcalibration == updatesensor.sensorcalibration) {
								pcallback(null);
							} else {
								systemsensor.sensorcalibration = updatesensor.sensorcalibration;
								detailchange = true;
								pcallback(null);
							}
						}
					],
					// optional callback
					function(err){
						// if (detailchange) set changeexist to true
						if (detailchange) {
							changeexist = true;
							systemsensor.sensorlastchange = Date();
							cb();
						}
						// the results array will equal ['one','two'] even though
						// the second function had a shorter timeout.
					});
				}
				updatecb()
			},function(jsonerr){
				if (sensorexist == false) {
					systemjson.sensors.push({sensoraddress:updatesensor.sensoraddress,
						sensorname:updatesensor.sensorname,
						sensorloc:updatesensor.sensorloc,
						sensorstatus:updatesensor.sensorstatus,
						sensorcalibration:updatesensor.sensorcalibration,
						sensorlastchange:Date()
					})
					changeexist = true;
				} else {
					if (detailchange) {
						changeexist = true;
					}
				}
			})
		},function(err){
			if( err ) {
				// One of the iterations produced an error.
				// All processing will now stop.
				console.log('An id failed to process');
			} else {
				console.log('All ids have been processed successfully');
				callback(changeexist,systemjson);
			}
		})
	}

}

function checkSensors(systemjson,callback){
	sense.sensors(function(err, ids) {
		if (systemjson.sensors.length == 0) {
			async.each(ids,function(sensorid,cb){
				systemjson.sensors.push({sensoraddress:sensorid,
					sensorname:'',
					sensorloc:'',
					sensorstatus:'',
					sensorcalibration:'',
					sensorlastchange:Date()
				})
				cb();
			},function(err){
				if(err) {
					// One of the iterations produced an error.
					// All processing will now stop.
					console.log('An id failed to process');
				} else {
					console.log('All ids have been processed successfully');
					callback(systemjson);
				}
			})
		} else {
			//sensors are already in the list
			async.each(ids,function(sensorid,cb){
				var idexist = false;
				async.each(systemjson.sensors,function(jsonsensorid,jsoncb){
					if (sensorid == jsonsensorid) {
						idexist = true;
					}
					jsoncb()
				},function(jsonerr){
					if (idexist == false) {
						systemjson.sensors.push({sensoraddress:sensorid,
							sensorname:'',
							sensorloc:'',
							sensorstatus:'',
							sensorcalibration:'',
							sensorlastchange:Date()
						})
					}
					cb();
				})
			},function(err){
				if( err ) {
					// One of the iterations produced an error.
					// All processing will now stop.
					console.log('An id failed to process');
				} else {
					console.log('All ids have been processed successfully');
					callback(systemjson);
				}
			})
		}
	});
}

exports.checkSensors = function(systemjson,callback) {
	checkSensors(systemjson,callback);
}

function checkTemp(socket,Sensor) {
	Sensor.find({},function(err, sensors) {
		sensors.forEach(function(tempSensor) {
			sense.temperature(tempSensor.address, function(err, value) {
				var newReading = value+tempSensor.calibration;
				Sensor.update({address:tempSensor.address},{lastValue:tempSensor.value,
					value:newReading,date:Date()}, function(err, numberAffected, raw) {
  					if (err) console.log('Error:',err);
				});
			});
		})
	});
	Sensor.find({},function(err,sensors){
		if (socket) socket.emit('tempout', {'tempout': sensors});
	})
}


exports.checkTemp = function(socket,Sensor) {
	checkTemp(socket,Sensor);
}

exports.updateSensor = function(socket,Sensor,sensor) {
	Sensor.update({address:sensor.address},{active:sensor.active,
		calibration:sensor.calibration},function (err, numberAffected, raw) {
			if (err) console.log('Error:',err);
			console.log('The number of updated documents was %d', numberAffected);
			console.log('The raw response from Mongo was ', raw);
	});
	Sensor.find({},function (err, checksensors) {
		socket.emit('checksensors', {'checksensors': checksensors});
	});
	checkTemp(socket,Sensor);
}

exports.updateSensors = function(socket,Sensor,sensors) {
	sensors.forEach(function(sensor){
			Sensor.update({address:sensor.address},{active:sensor.active, name:sensor.name, location:sensor.location,
				calibration:sensor.calibration},function (err, numberAffected, raw) {
					if (err) console.log('Error:',err);
					console.log('The number of updated documents was %d', numberAffected);
					console.log('The raw response from Mongo was ', raw);
			});
		})
		Sensor.find({},function (err, checksensors) {
			socket.emit('checksensors', {'checksensors': checksensors});
		});
		checkTemp(socket,Sensor);
}