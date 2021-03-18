/* 	Synoptics.
	Copyright (C) 2019 DISIT Lab http://www.disit.org - University of Florence

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as
	published by the Free Software Foundation, either version 3 of the
	License, or (at your option) any later version.
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.
	You should have received a copy of the GNU Affero General Public License
	along with this program. If not, see <http://www.gnu.org/licenses/>. */
	
var fs = require("fs");
eval(fs.readFileSync('benchloader.cfg')+'');
var mysql = require('mysql');
var db_config = {
	host     : config["dbHost"],
	user     : config["dbUser"],
	password : config["dbPass"],
	database : config["dbName"],
	table	 : config["dbTbl"]
};
var connection = mysql.createConnection(db_config); 
connection.connect(function(err) { 							
	if(err) { 												
		console.log('DB Connection Error: ', err);
		process.exit(1);
	}                                     					
});                                     					
connection.on('error', function(err) {
	console.log('DB Error: ', err);								
	process.exit(1);																					
});
var input = JSON.parse(fs.readFileSync(process.argv[2])+'');
Object.keys(input).forEach(function(key){
	connection.query(
		"insert into "+db_config["table"]+"(unid,ctx,lbl,start,end) values (?,?,?,FROM_UNIXTIME(? * 0.001),FROM_UNIXTIME(? * 0.001))",
		[ key.substring(0,255), input[key][1].substring(0,255), input[key][2].substring(0,255), input[key][0], input[key][3] ],
		function (error, results) { 
			if(error) {
				console.log('DB Insert Error: ', error);								
				process.exit(1);	
			}
		}
	);
	
});
connection.end();