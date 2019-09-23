/* Synoptics.
 Copyright (C) 2019 DISIT Lab http://www.disit.org - University of Florence
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as
 published by the Free Software Foundation, either version 3 of the
 License, or (at your option) any later version.
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.
 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>. */
 
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var mysql = require('mysql');
var fs = require("fs");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var interval = null;
var idvalueMap = {};
var privateKey = fs.readFileSync("192.168.0.48.key","utf8");
var certificate = fs.readFileSync("192.168.0.48.pem","utf8");
var credentials = { key: privateKey, cert: certificate };
var https = require('https').createServer(credentials,app);
var io = require('socket.io')(https);
var socketsBin = [];

app.use("/", express.static(__dirname ));

app.get('/home', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/altair', function(req, res){
  res.sendFile(__dirname + '/altair.html');
});

app.get('/gida', function(req, res){
  res.sendFile(__dirname + '/gida.html');
});

app.get('/tramvia', function(req, res){
  res.sendFile(__dirname + '/tramvia.html');
});

function readKPIs(socket) {
	try {

			if(socketsBin.includes(socket.id)) return;

			var xmlHttp2 = new XMLHttpRequest();
			xmlHttp2.open( "GET", "https://www.snap4city.org/mypersonaldata/api/v1/kpidata?accessToken="+socket.handshake.query.accessToken+"&sourceRequest="+socket.handshake.query.sourceRequest, true );
			xmlHttp2.onreadystatechange = function() {
				if(xmlHttp2.readyState < 4) return;
				if(xmlHttp2.status == 200) {
					var responseJson = JSON.parse(xmlHttp2.responseText);	
					for(var t = 0; t < responseJson.length; t++) {
						io.in(socket.id).emit(responseJson[t]["valueName"],responseJson[t]["lastValue"]);
						idvalueMap[responseJson[t]["valueName"]] = responseJson[t]["id"];
					}
				}
				else {
					socketsBin.push(socket.id);
					io.in(socket.id).emit("error","try reloading"); 
					setTimeout(function(){socket.disconnect('unauthorized');},1000);
				}				
			};
			xmlHttp2.send(null);			


			var xmlHttp3 = new XMLHttpRequest();
                        xmlHttp3.open( "GET", "https://www.snap4city.org/mypersonaldata/api/v1/kpidata/delegated?accessToken="+socket.handshake.query.accessToken+"&sourceRequest="+socket.handshake.query.sourceRequest, true );
                        xmlHttp3.onreadystatechange = function() {
                                if(xmlHttp3.readyState < 4) return;
                                if(xmlHttp3.status == 200) {
                                        var responseJson = JSON.parse(xmlHttp3.responseText);
                                        for(var t = 0; t < responseJson.length; t++) {
						io.in(socket.id).emit(responseJson[t]["valueName"],responseJson[t]["lastValue"]);
                                                idvalueMap[responseJson[t]["valueName"]] = responseJson[t]["id"];
                                        }
                                }
                                else {
                                        socketsBin.push(socket.id);
					io.in(socket.id).emit("error","try reloading");
					setTimeout(function(){socket.disconnect('unauthorized');},1000);
                                }
                        };
                        xmlHttp3.send(null);


			var xmlHttp4 = new XMLHttpRequest();
                        xmlHttp4.open( "GET", "https://www.snap4city.org/mypersonaldata/api/v1/kpidata/public?accessToken="+socket.handshake.query.accessToken+"&sourceRequest="+socket.handshake.query.sourceRequest, true );
                        xmlHttp4.onreadystatechange = function() {
                                if(xmlHttp4.readyState < 4) return;
                                if(xmlHttp4.status == 200) {
                                        var responseJson = JSON.parse(xmlHttp4.responseText);
                                        for(var t = 0; t < responseJson.length; t++) {
						io.in(socket.id).emit(responseJson[t]["valueName"],responseJson[t]["lastValue"]);
                                                idvalueMap[responseJson[t]["valueName"]] = responseJson[t]["id"];
                                        }
                                }
                                else {
                                        socketsBin.push(socket.id); 
					io.in(socket.id).emit("error","try reloading");
					setTimeout(function(){socket.disconnect('unauthorized');},1000);
                                }
                        };
                        xmlHttp4.send(null);

	
			
	}		
	catch(aee) {
		console.log(aee);
	}
}

io.on('connection', function(socket){ 
		
		socket.join(socket.id);
		
		readKPIs(socket);
		
		interval = setInterval(function() { readKPIs(socket); } ,60000);		
		
		socket.on('disconnect', function(){		
			clearInterval(interval);
		});
		
		socket.on('write', function(msg) {
			
			try {
					var txt = "[" + msg + "]";
					var arr = JSON.parse(txt);
					for(var o = 0; o < arr.length; o++) {
						var obj = arr[o];
						if(obj["attr"] == "set") {
							var xmlHttpw = new XMLHttpRequest();
							xmlHttpw.open("POST","https://www.snap4city.org/mypersonaldata/api/v1/kpidata/"+idvalueMap[obj["tag"]]+"/values?accessToken="+socket.handshake.query.accessToken+"&sourceRequest="+socket.handshake.query.sourceRequest,true);
							xmlHttpw.setRequestHeader("Content-Type", "application/json");
							xmlHttpw.onreadystatechange = function() {
								if(xmlHttpw.readyState < 4) return;
								if(xmlHttpw.status != 200) {
									console.log("Unable to write value. Status = "+xmlHttpw.status+". Response = "+xmlHttpw.responseText+".");
								}	
								else {
									console.log("Value written");
									readKPIs(socket);
								}							
							};
							var dataTime = new Date();	
							xmlHttpw.send(JSON.stringify({ "dataTime": dataTime.getTime(), "value": obj["src"]}));
						}
					}
					
			}		
			catch(aee) {
				console.log(aee);
			}					
					
	  });
	
});
http.listen(3000, function(){ console.log('HTTP server listening on *:3000'); });
https.listen(3001, function(){ console.log('HTTPS server listening on *:3001'); });
