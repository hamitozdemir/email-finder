
current_ids = []; // global because needs to assign in fetch
current_cursor = 1; // current index + 1 of current_ids (which will be accessed on user input)
current_author = ''; // global author to use for getting e-mail parents

search = () => {
	let author = document.getElementById('author').value; // TODO: strip of extra white space leading, preceding or inbetween
	if (author == '') {
		display_results('error', 'author name required.');
		return 1;
	} else {
		display_results('error', ''); // clear above error
	}
	current_author = author
	let extra = document.getElementById('extra').value;
	console.log(author);
	console.log(extra);

	fetch_ids();
	// fetch_mails();

};

fetch_ids = () => {
		let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=Fumihito%20Hirai[Author]+gastroenterology';
	
		try {
			fetch(url)
			.then(handle_connection_error)
			.then((response) => response.text())
			.then((text) => {
				display_results('error', '');
				const parser = new DOMParser();
				const doc = parser.parseFromString(text, 'text/xml');
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
			});
		} catch (error) {
			console.log(error);
			//display_results('error', 'connection error. re-try please!');
		}
};

// @args: id array passed as joined string with ','
// e.g. 11079516,11068439,10050046
fetch_mails = (strung_ids) => {
	let url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${strung_ids}&rettype=xml&retmode=xml`
	
	fetch(url)
	.then((response) => response.text())
	.then((text) => {
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, 'text/xml');
		let xmldoc = doc.documentElement

		// TODO: i think, to get pubmed id directly, requires here that i split by <article> into each elem, then gather emails under those into a dictionary or an array

		let emails_arr_html_col = xmldoc.getElementsByTagName('email')
		let emails_list = Array.from(emails_arr_html_col);
		console.log('email list')
		console.log(emails_list)

		// FIXME: not used right now
		let mail_list = [] // new list to hold all profiles?
		let parent_list = [] // mail parent list for lefthand side
		// TODO: also add pubmed ids with clickable links here

		let output = '<table class=\'results-table\'>';
		emails_list.forEach(elem => {
			// if parent has current_author split name? reverse name? just has name?
			let parent_elem = null;
			// TODO: possibly opt to use regex instead of includes for three-four-five word names, including any words? at least two words? or reverse-ordered names
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
				output += get_mail_line(elem, parent_elem);
			}
		});
		output += '</table>';
		document.getElementById('results').innerHTML += output;
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
	<button id='access-next-button' onclick='access_next_set_of_ids()'>Find!</button>

	`
	// change button text to re-try if pull is unsuccessful
};

access_next_set_of_ids = () => {
	// when reaching length, disable button
	// need to get current values here, then increment
	// TODO: disable button on click and re-enable when fetch mails is complete?
	fetch_mails(current_ids[current_cursor - 1].join(','));
	current_cursor += 1;
	if (current_ids.length < current_cursor) {
		document.getElementById('access-next-button').disabled = true;
	}
	display_results('look-through', `Look through ${current_cursor}/${current_ids.length}?`);
};

// args, mail: email object, parent_elem; the parent object that has the current author's name in parent or parent's parent or parent's parent's parent
get_mail_line = (mail, parent_elem) => {
	// TODO: possibly remove mail from parent for clearer display and removing repetition?
	return `<tr class='mail-line'>
		<td>${parent_elem.innerHTML}</td>
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

clear = () => {

};

handle_connection_error = (response) => {
	if (!response.ok) {
		display_results('error', 'connection error. re-try please!');
		console.log(error); // FIXME: possibly this gets executed, but didn't have console.log for testing, so maybe display_results error just got overriden at the start of the rest of the functionality
		throw new Error(response.status);
	}
	return response;
};

	// TODO: have ability to re-try connection if unable to reach for a chunk
	// also have the option to re-try connection on main IDs fetch
	// clear functionality for output
	// on each call append the list of e-mails and info into a different div, spawning on top, so prepend and re-draw? look into .insertAdjacentHTML (https://stackoverflow.com/a/22260849/4085881)
	// re-try in fetch itself a few times? before giving an option to re-try outside?
