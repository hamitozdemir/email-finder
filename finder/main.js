
current_ids = []; // global because needs to assign in fetch
current_cursor = 1; // current index + 1 of current_ids (which will be accessed on user input)

search = () => {
	let author = document.getElementById('author').value;
	if (author == '') {
		display_results('error', 'author name required.');
		return 1;
	} else {
		display_results('error', ''); // clear above error
	}
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

		let emails_arr_html_col = xmldoc.getElementsByTagName('email')
		let emails_list = Array.from(emails_arr_html_col);
		console.log(emails_list)
		// corresp or contrib 
		// corresp: direct contact info under author information
		// contrib: additional mails listed under contributor information

		let corresp_list = [] // corresp>> "information", email
		let contrib_list = [] // contrib>> name>>surname,givenname, address>>email
		let contrib_list_one_level = [] // contrib>> name, email
		let contrib_list_one_level_p = [] // p>> "info", email
		// FIXME: getting out of hand

		emails_list.forEach(elem => {
			if (elem.parentNode.nodeName == 'corresp') {
				corresp_list.push(elem.parentNode);
			} else if (elem.parentNode.nodeName == 'contrib') { // contrib>> name, email
					contrib_list_one_level.push(elem.parentNode);
			} else if (elem.parentNode.nodeName == 'p') { // p>> "info", email
				contrib_list_one_level_p.push(elem.parentNode);
			} else { // contrib>> name>>surname,givenname, address>>email
				contrib_list.push(elem.parentNode.parentNode);
			}
		});

		console.log(corresp_list);
		console.log(contrib_list);
		console.log(contrib_list_one_level);
		console.log(contrib_list_one_level_p);

		let output = '<table class=\'results-table\'>';
		corresp_list.forEach(elem => {
			output += get_corresp_line(elem);
		});
		contrib_list.forEach(elem => {
			output += get_contrib_line(elem);
		});
		contrib_list_one_level.forEach(elem => {
			output += get_contrib_line_one_level(elem);
		});
		contrib_list_one_level_p.forEach(elem => {
			output += get_contrib_line_one_level_p(elem);
		});
		output += '</table>'; // TODO: possibly put this in a div here for better readability when adding multiple tables?

		// TODO: change this with insertAdjacentHTML to prepend
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

// corresp obj>> "information", email
get_corresp_line = (corresp) => {
	// TODO: possibly split last child initially, and give the rest of the info to first cell, instead of duplicate email
	return `<tr class='corresp-line'>
		<td>${corresp.innerHTML}</td>
		<td>${corresp.lastElementChild.innerHTML}</td>
	</tr>`;
};

// contrib>> name>>surname,givenname, address>>email
// FIXME: need more samples for fixing
get_contrib_line = (contrib) => {
	return `<tr class='contrib-line'>
		<td>${contrib.children[0].innerHTML}</td>
		<td>${contrib.lastChild.innerHTML}</td>
	</tr>`;
};

// contrib>> name, email
get_contrib_line_one_level = (contrib) => {
	return `<tr class='contrib-line-one-level'>
		<td>${contrib.children[0].innerHTML}</td>
		<td>${contrib.children[1].innerHTML}</td>
	</tr>`;
};

// p>> "info", email
get_contrib_line_one_level_p = (contrib) => {
	return `<tr class='contrib-line-one-level-p'>
	<td>${contrib.childNodes[0].nodeValue}</td>
	<td>${contrib.lastChild.innerHTML}</td>
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
