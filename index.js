const argv = require('minimist')(process.argv.slice(2));
const inquirer = require('inquirer');
const moment = require('moment');

const options = require('./config');

const loggers = {
	freshbooks: require('./logger/FreshbooksLogger').create(options)
};

if(argv.h) {
	return console.log(
		`Create logentries for several systems and complex logging workflows
Parameters:
-n : Taskname (Optional) - must be in quotes for multiterm strings
-l : Loggername (Optional) - ${Object.entries(loggers).map((entry)=>'\''+entry[0]+'\'').join(',')}`);
}

const bottom = new inquirer.ui.BottomBar();

if(argv._.indexOf('start') > -1) {
	start({
		duration: moment.duration(0),
		name: argv.n || 'NONAME',
		logger: argv.l
	});
} else if(argv._.indexOf('log') > -1) {
	stop({});
} else {
	bottom.close();
	console.error("Command not supported");
}

function updateBottom(task) {
	bottom.updateBottomBar(`task '${task.name}' now runs for ${task.duration}`);//TODO .humanize()
}

function pause(task) {
	inquirer.prompt([{name:"action",message:`Task '${task.name}' paused at ${moment().format()}. Continue?`,type:'list',default:'Continue',choices:["Continue","Stop","Cancel"]}]).then(answer => {
		switch(answer.action) {
			case 'Continue': return start(task);
			case 'Stop':return stop(task);
			default: return cancel(task);
		}
	});
}

function log(task) {
	loggers[task.logger].log(task,inquirer).then(
		()=>{
			console.log(`Task logged successully to ${loggers[task.logger].name}`);
		},
		(e)=>{
			console.error(`Logging task to ${loggers[task.logger].name} failed`, e);
		})
}

function stop(task) {

	inquirer.prompt([
		{name:'name',message:'Taskname',default:task.name},
		{name:'duration',message:'Duration (in hours)',default:task.duration ? ((task.duration.asMilliseconds()/3600000).toFixed(2)) : 0.0}
	]).then(answers => {

		task.name = answers.name;
		task.duration = moment.duration(parseFloat(answers.duration.replace(',','.')) * 3600000);

		if(task.logger) {
			log(task);
		} else {
			const choices = Object.entries(loggers).map((entry) => {return {value:entry[0],name:entry[1].name}});

			inquirer.prompt([{name:"logger",message:'Which Logger you want to use',type:'list',choices}]).then(answer => {
				task.logger = answer.logger;
				log(task);
			});
		}
	});
}

function start(task) {

	const startdate = task.duration ? moment().subtract(task.duration) : moment();

	const interval = setInterval(() => {
		task.duration = moment.duration(moment().diff(startdate));
		updateBottom(task);
	},2000);

	inquirer.prompt([{name:"action",message:`Task '${task.name}' ${(task.duration.seconds() === 0) ? '' : 're'}started at ${startdate.format()}`,type:'list',default:'Stop',choices:["Stop","Pause","Cancel\n"]}]).then(answer => {
		clearInterval(interval);
		switch(answer.action) {
			case 'Pause': return pause(task);
			case 'Stop':return stop(task);
			default: return cancel(task);
		}
	});

	updateBottom(task);
}

function cancel(task) {
	inquirer.prompt([{name:"confirm",message:`Really cancel Task '${task.name}'?`,type:'confirm',default:false}]).then(answer => {
		if(answer.confirm) {
			console.log('Task canceled')
		} else {
			pause(task);
		}
	});
}
