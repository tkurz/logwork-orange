const fuzzy = require('fuzzy');
const inquirer = require('inquirer');
const rp = require('request-promise-native');

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

class FreshbooksLogger {
	constructor(options) {
		this.userpart = options.freshbooks.key + ":*"
	}

	get name() {
		return 'Freshbooks';
	}

	_listProjects(answer, input, userpart) {
console.log(userpart);
		var options = {
			method: 'POST',
			uri: 'https://'+userpart+'@redlink-billing.freshbooks.com/api/2.1/xml-in',
			body: '<?xml version="1.0" encoding="utf-8"?><request method="project.list"></request>',
			headers : {
				"Authorization" : this.auth
			}
		};

		input = input || '';

		return new Promise((resolve) => {

			rp(options)
				.then(function (data) {
					console.log(data);
					const result = ['test'];
					const fuzzyResult = fuzzy.filter(input, result);
					resolve(fuzzyResult.map(function(el) {
						return el.original;
					}));
				})
				.catch(function (err) {
					console.log(err);
				});
		});

	};

	log(task) {

		return new Promise((resolve, reject) => {

			const questions = [];

			if(!task.freshbooksProject) {
				questions.push({
					type: 'autocomplete',
					name: 'project',
					message: 'Select a project',
					source: (answer, input) => {
						return this._listProjects(answer, input, this.userpart)
					},
					pageSize: 4
				})
			}

			inquirer.prompt(questions).then(function(answers) {
				console.log(answers);
				resolve();
			});

		})
	}
}

module.exports.create = (options) => {
	return new FreshbooksLogger(options);
};
