
current_ids = []; // global because needs to assign in fetch
current_cursor = 1; // current index + 1 of current_ids (which will be accessed on user input)
current_author = ''; // global author to use for getting e-mail parents

search = () => {
	clear_ui(true);
	let author = document.getElementById('author').value.replace(/\s+/g,' ').trim();
	document.getElementById('author').value = author;
	if (author == '') {
		display_results('error', 'author name required.');
		return 1;
	} else {
		display_results('error', ''); // clear above error
	}
	current_author = author
	let extra = document.getElementById('extra').value.replace(/\s+/g,' ').trim();
	document.getElementById('extra').value = extra;
	console.log(author);
	console.log(extra);

	fetch_ids(author, extra);
	// fetch_mails();

};

fetch_ids = (author, extra) => {
		// let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=Fumihito%20Hirai[Author]+gastroenterology';
		let url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${author}[Author]+${extra}`;
	
		fetch(url)
		.then(handle_connection_error)
		.then((response) => response.text())
		.then((text) => {
			display_results('error', '');
			const parser = new DOMParser();
			const doc = parser.parseFromString(text, 'text/xml');

			let count = parseInt(doc.documentElement.childNodes[0].innerHTML);
			if (count <= 0) {
				display_results('error', '0 results found.');
				return 1;
			}

			let id_arr_html_col = doc.documentElement.childNodes[3].children
	
			let id_list = Array.from(id_arr_html_col);
			console.log(id_list) // Id objects
			console.log(id_list[0].textContent) // id as string stripped from <Id> </Id>
			console.log(typeof(id_list[0])) // object
			console.log(typeof(id_list[0].textContent)) // string
	
			let id_list_strings = id_list.map((i) => {return i.textContent}); // map text content (ids only) to a new array
			console.log(id_list_strings);
			// return id_list_strings; can't return since these are async
			// display_results(id_list_strings.join(', '));

			current_ids = splice_ids_array(id_list_strings);
			console.log(id_list_strings.length);
			console.log(current_ids.length);
			console.log(current_ids[0]);
			display_results('found-ids', `${id_list_strings.length} articles found.`);
			display_results('look-through', `Look through ${current_cursor}/${current_ids.length}?`);
			draw_actions_buttons();
		}).catch((error) => {
			console.log('CATCH FETCH IDS ERROR:');
			console.log(error);
			display_results('error', 'connection error. re-try please!');
		});
};

// @args: id array passed as joined string with ','
// e.g. 11079516,11068439,10050046
fetch_mails = (strung_ids) => {
	let url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${strung_ids}&rettype=xml&retmode=xml`
	
	fetch(url)
	.then(handle_connection_error)
	.then((response) => response.text())
	.then((text) => {
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, 'text/xml');
		let xmldoc = doc.documentElement

		let articles_arr_html_col = xmldoc.getElementsByTagName('article')
		let articles_list = Array.from(articles_arr_html_col);
		console.log('articles list')
		console.log(articles_list);

		let pmc_id_mails_ids = [];
		let pmc_id_mails_mails = [];
		console.log('articles mails?')
		articles_list.forEach(element => {
			let id = Array.from(element.getElementsByTagName('article-id'))[1].innerHTML; // FIXME: surely pmc id is always the second one, right? right???
			let mails = Array.from(element.getElementsByTagName('email'));
			// FIXME: could probably instead use a dictionary?
			pmc_id_mails_ids.push(id);
			pmc_id_mails_mails.push(mails);

		});

		let output = `<table class='results-table'>
		<tr><th>pmc</th><th>details</th><th>mail</th></tr>
		`;

		for (let i = 0; i < pmc_id_mails_ids.length; i++) {
			console.log(`idmailpairs${i}`);
			console.log(pmc_id_mails_ids[i]);
			pmc_id_mails_mails[i].forEach(elem => {
				if (document.getElementById('author_only_check').checked) {
					// if parent has current_author split name? reverse name? just has name?
					let parent_elem = null;
					// TODO: possibly opt to use regex instead of includes for three-four-five word names, including any words? at least two words? or reverse-ordered names

					/* FIXME: works, sort of. 
					- on 3rd level gets a ton of results
					- on 2nd level, doesn't work better than just using name, gets name(s) without spaces in between
					let split_author_name = current_author.split(' '); // assumes two names only? well, regex will just use two names in any length of a name
					let reg = new RegExp(`${split_author_name[0]}.*${split_author_name[1]}|${split_author_name[1]}.*${split_author_name[0]}`)

					if (reg.test(elem.parentNode.innerHTML)) {
					*/

					if (elem.parentNode.innerHTML.includes(current_author)) {
						parent_elem = elem.parentNode;
					} else if (elem.parentNode.parentNode.innerHTML.includes(current_author)) {
						parent_elem = elem.parentNode.parentNode;
					} else if (elem.parentNode.parentNode.parentNode.innerHTML.includes(current_author)) {
						parent_elem = elem.parentNode.parentNode.parentNode;
					} else {
						// output += get_no_author_line();
						// TODO: consider adding "no mail for this person" line one way or another somehow prettily
						// printing a line for every non-existent mail is just clutter at the moment
					}
					if (parent_elem) {
						output += get_mail_line(elem, parent_elem, pmc_id_mails_ids[i]);
					}
				} else {
					parent_elem = elem.parentNode; // decent compromise to get some details in? trying to get parent's parent instead gets a ton of unnecessary text in to display, this only displays the person's name most of the time, but yeah, somewhat of a compromise
					output += get_mail_line(elem, parent_elem, pmc_id_mails_ids[i]);
				}
			});
		};

		output += '</table>';
		// newer results gets prepended to top
		document.getElementById('results').insertAdjacentHTML('afterbegin', output);
	}).catch((error) => {
		console.log('CATCH FETCH MAILS ERROR:');
		console.log(error);
		display_results('error', 'connection error. re-try please!');
		dial_back_to_previous_set_of_ids();
	});
};

display_results = (div_id, text) => {
	document.getElementById(div_id).innerHTML = text;
};

// split ids array into manageable chunks
splice_ids_array = (arr) => {
	let split_arr = []

	let size = 6; // TODO: check performance difference and change accordingly
	for (let i = 0; i < arr.length; i += size) {
		const chunk = arr.slice(i, i + size);
		split_arr.push(chunk);
	};

	return split_arr;
}

draw_actions_buttons = () => {
	let div = document.getElementById('actions-buttons');
	div.innerHTML = `
	<button class='waves-effect waves-light btn' id='access-next-button' onclick='access_next_set_of_ids()'>Find!</button>

	`
	// change button text to re-try if pull is unsuccessful
};

access_next_set_of_ids = () => {
	// when reaching length, disable button
	// need to get current values here, then increment
	// TODO: disable button on click and re-enable when fetch mails is complete?
	// state machine with is_searching global var? that gets turned on on button clicks, disabling buttons in state machine, and off after fetches or errors
	display_results('error', '');
	fetch_mails(current_ids[current_cursor - 1].join(','));
	current_cursor += 1;
	update_mail_ids_related_ui_elems();
};

dial_back_to_previous_set_of_ids = () => { // FIXME: possibly not working? especially when spam clicking? needs more testing
	current_cursor -= 1;
	// FIXME: if fails on first fetch (and last? length 1 fetch that is) doesn't re-enable button. if cursor is 1 possibly need to change related disable functionality under update_mail_ids_related_ui_elems(), well, rather re-enable with an else?
	update_mail_ids_related_ui_elems();
};

// same functionality necessary in both functions in relation to moving current cursor and updating UI
update_mail_ids_related_ui_elems = () => {
	console.log(`cursor: ${current_cursor}`);
	if (current_ids.length < current_cursor) {
		document.getElementById('access-next-button').disabled = true;
	} else { // possibly fixes fetch error at 1 and at length, not re-enabling the "find" button
		document.getElementById('access-next-button').disabled = false;
	}
	display_results('look-through', `Look through ${current_cursor}/${current_ids.length}?`);
};

// args, mail: email object, parent_elem; the parent object that has the current author's name in parent or parent's parent or parent's parent's parent
get_mail_line = (mail, parent_elem, id) => {
	return `<tr class='mail-line'>
		<td><a href='https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/' target='_blank'>${id}</a></td>
		<td>${parent_elem.innerHTML.replace(mail.innerHTML, '')}</td>
		<td>${mail.innerHTML}</td>
	</tr>`;
};

// unused for printing a line for when parent object with current author's name isn't identified
get_no_author_line = () => {
	return `<tr class='no-mail-line error'>
		<td>No mail for ${current_author}</td>
		<td></td>
	</tr>`;
};

// keep_fields exception for clearing in search()
clear_ui = (keep_fields = false) => {
	if (!keep_fields) {
		document.getElementById('author').value = '';
		document.getElementById('extra').value = '';
	}
	current_ids = [];
	current_cursor = 1;
	current_author = '';
	display_results('found-ids', '');
	display_results('look-through', '');
	display_results('actions-buttons', '');
	display_results('results', '');
	display_results('error', '');
};

handle_connection_error = (response) => {
	if (!response.ok) {
		display_results('error', 'connection error. re-try please!');
		console.log(error);
		throw new Error(response.status);
	}
	return response;
};

	// TODO: have ability to re-try connection if unable to reach for a chunk
	// also have the option to re-try connection on main IDs fetch
	// clear functionality for output
	// on each call append the list of e-mails and info into a different div, spawning on top, so prepend and re-draw? look into .insertAdjacentHTML (https://stackoverflow.com/a/22260849/4085881)
	// re-try in fetch itself a few times? before giving an option to re-try outside?

	// checkbox to show all e-mails or only author-name (don't reset this one on clear)
	// also add option? to search through pubmed as well, check how pubmed results are fetched, i guess two separate searches behind the scenes would make organising a lot easier. so same as what i have. probably have a separate array to hold pubmed ids on top of current_ids, and a separate cursor? possibly just use the same cursor but ... hmm... add lengths of both to cursor max limit? then going to second array (pubmed) subtract pmc array length?
