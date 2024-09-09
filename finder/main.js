
current_ids = []; // global because needs to assign in fetch
current_cursor = 1; // current index + 1 of current_ids (which will be accessed on user input)
current_author = ''; // global author to use for getting e-mail parents
is_pubmed_search = false; // global pubmed db switch, only gets assigned in search()


// bind enter key to author/extra inputs
initial_binds = () => {
	document.getElementById('author').addEventListener('keypress', (e) => input_enter_bind(e));
	document.getElementById('extra').addEventListener('keypress', (e) => input_enter_bind(e));
};

// bind enter key to search for initial_binds()
input_enter_bind = (e) => {
	if (e.key === 'Enter') {
		e.preventDefault();
		search();
	}
};

search = () => {
	clear_ui(true);
	let author = document.getElementById('author').value.replace(/\s+/g,' ').trim();
	document.getElementById('author').value = author;
	if (author == '') {
		display_results('error', 'Author name required.');
		return 1;
	} else {
		display_results('error', ''); // clear above error
	}
	display_progress_bar(true);
	current_author = author
	let extra = document.getElementById('extra').value.replace(/\s+/g,' ').trim();
	document.getElementById('extra').value = extra;

	is_pubmed_search = document.getElementById('radio_pubmed').checked; // only assign this on search click so it won't get confused for the rest of it if changed half-way through
	fetch_ids(author, extra);
};

fetch_ids = (author, extra) => {
	let url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=${is_pubmed_search ? 'pubmed' : 'pmc'}&term=${author}[Author]+${extra}&retmax=200`;

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
			display_progress_bar();
			return 1;
		}

		let id_arr_html_col = doc.documentElement.childNodes[3].children
		let id_list = Array.from(id_arr_html_col);
		let id_list_strings = id_list.map((i) => {return i.textContent}); // map text content (ids only) to a new array

		current_ids = splice_ids_array(id_list_strings);
		display_results('found-ids', `${id_list_strings.length} articles found.`);
		display_results('look-through', `Look through ${current_cursor} / ${current_ids.length}?`);
		draw_actions_buttons();
		display_progress_bar();
	}).catch((error) => {
		console.log('CATCH FETCH IDS ERROR:');
		console.log(error);
		display_results('error', 'Connection error. Re-try please!');
		display_progress_bar();
	});
};

// @args: id array passed as joined string with ','
// e.g. 11079516,11068439,10050046
fetch_mails = (strung_ids) => {
	let url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=${is_pubmed_search ? 'pubmed' : 'pmc'}&id=${strung_ids}&rettype=xml&retmode=xml`;
	
	fetch(url)
	.then(handle_connection_error)
	.then((response) => response.text())
	.then((text) => {
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, 'text/xml');
		let xmldoc = doc.documentElement

		let article_tag = is_pubmed_search ? 'PubmedArticle' : 'article';

		let articles_arr_html_col = xmldoc.getElementsByTagName(article_tag)
		let articles_list = Array.from(articles_arr_html_col);

		let article_id_mails_list_ids = [];
		let article_id_mails_list_mails = [];
		articles_list.forEach(article => {
			let id = '';
			let mails = [];
			if (is_pubmed_search) {
				id = Array.from(article.getElementsByTagName('PMID'))[0].innerHTML;
				let affiliations_list = Array.from(article.getElementsByTagName('Affiliation'));
				affiliations_list.forEach(affiliation => {
					if (affiliation.innerHTML.includes('@')) { // very primitive but there doesn't seem to bo many other options without an actual tag covering mails like pmc
						mails.push(affiliation);
					}
				});
			} else {
				id = Array.from(article.getElementsByTagName('article-id'))[1].innerHTML; // FIXME: surely pmc id is always the second one, right? right???
				mails = Array.from(article.getElementsByTagName('email'));
			}
			// FIXME: could probably instead use a dictionary?
			article_id_mails_list_ids.push(id);
			article_id_mails_list_mails.push(mails);
		});

		let output = `<table class='results-table'>
		<tr><th>ID</th><th>Details</th><th>Mail</th></tr>
		`;
		let empty_output = output; // compare for empty output lines and display 'no author mail' if no change is found (i.e. additions of mail lines)

		for (let i = 0; i < article_id_mails_list_ids.length; i++) {
			article_id_mails_list_mails[i].forEach(elem => {
				// FIXME: unlike pmc vs pubmed check, author_only_check is made on each call
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

					TODO: could possibly simply go for correct order with space and reverse order with space in between, just these two
					*/
					let split_author_name = current_author.split(' '); // assumes two names only

					// TODO: check middle names, and multiple name people and try to include them, especially here in pubmed section
					// also possibly for spanish, use first and -1th words as first name and last name?

					// if length is more than 2, could get [0] at start space, and rest of the names with or in between; or the same thing in reverse order, could just pop first element to a first_name var and join rest with | so it can support any length
					// would still require taking a look at pubmed tag formatting with multiple names

					if (is_pubmed_search) {
						let reg = new RegExp(`<LastName>${split_author_name[1]}</LastName>.*<ForeName>${split_author_name[0]}</ForeName>`);
						if (reg.test(elem.parentNode.parentNode.innerHTML)) {
							parent_elem = elem.parentNode.parentNode;
						}
					} else {
						let reg = new RegExp(`${split_author_name[0]} *${split_author_name[1]}|${split_author_name[1]} *${split_author_name[0]}`);
						if (reg.test(elem.parentNode.innerHTML)) {
							parent_elem = elem.parentNode;
						} else if (reg.test(elem.parentNode.parentNode.innerHTML)) {
							parent_elem = elem.parentNode.parentNode;
						} else if (reg.test(elem.parentNode.parentNode.parentNode.innerHTML)) { // FIXME: possibly remove 3rd level parent?
							parent_elem = elem.parentNode.parentNode.parentNode;
						}
					}
					if (parent_elem) {
						output += get_mail_line(elem, parent_elem, article_id_mails_list_ids[i]);
					}
				} else {
					parent_elem = is_pubmed_search ? elem.parentNode.parentNode : elem.parentNode; // decent compromise to get some details in? trying to get parent's parent instead gets a ton of unnecessary text in to display, this only displays the person's name most of the time, but yeah, somewhat of a compromise
					output += get_mail_line(elem, parent_elem, article_id_mails_list_ids[i]);
				}
			});
		};

		if (empty_output == output) {
			output += `<tr class='mail-line'>
				<td></td>
				<td class='grayed-mail'>No author mail found, there may be non-author mail(s).</td>
				<td></td>
			</tr>`;
		}

		output += '</table>';
		// newer results gets prepended to top
		document.getElementById('results').insertAdjacentHTML('afterbegin', output);
		disable_find_button();
	}).catch((error) => {
		console.log('CATCH FETCH MAILS ERROR:');
		console.log(error);
		display_results('error', 'Connection error. Re-try please!');
		dial_back_to_previous_set_of_ids();
		disable_find_button();
	});
};

// output text to various divs by id
display_results = (div_id, text) => {
	document.getElementById(div_id).innerHTML = text;
};

// split ids array into manageable chunks
splice_ids_array = (arr) => {
	let split_arr = []

	let size = 20; // TODO: check performance difference and change accordingly
	for (let i = 0; i < arr.length; i += size) {
		const chunk = arr.slice(i, i + size);
		split_arr.push(chunk);
	};

	return split_arr;
};

draw_actions_buttons = () => {
	let div = document.getElementById('actions-buttons');
	div.innerHTML = `
	<button class='waves-effect waves-light btn' id='access-next-button' onclick='access_next_set_of_ids()'>Find!</button>

	`;
};

// on 'find' button press get the next set of mails depending on where cursor currently is, on fail dials back cursor
access_next_set_of_ids = () => {
	display_results('error', '');
	disable_find_button(true);
	find_button_label_to_retry();
	fetch_mails(current_ids[current_cursor - 1].join(','));
	current_cursor += 1;
	update_mail_ids_related_ui_elems();
};

// if fetch fails on mail search, dial back cursor
dial_back_to_previous_set_of_ids = () => {
	current_cursor -= 1;
	update_mail_ids_related_ui_elems();
	find_button_label_to_retry(true);
};

// same functionality necessary in both functions in relation to moving current cursor and updating UI
update_mail_ids_related_ui_elems = () => {
	display_results('look-through', `Look through ${current_cursor} / ${current_ids.length}?`);
};

// args, mail: email object, parent_elem; the parent object that has the current author's name in parent or parent's parent or parent's parent's parent, id: pmc/pubmed id of the article
get_mail_line = (mail, parent_elem, id) => {
	// TODO: perhaps add #full-view-affiliation-1 anchor for pubmed links?
	let url = is_pubmed_search 
		? `https://pubmed.ncbi.nlm.nih.gov/${id}/' target='_blank`
		: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/' target='_blank`;
	return `<tr class='mail-line'>
		<td><a href='${url}'>${id}</a></td>
		<td>${truncate_details_text(parent_elem.innerHTML.replace(mail.innerHTML, ''))}</td>
		<td>${mail.innerHTML}</td>
	</tr>`;
};

// disable find button while fetching mails, re-enable on completion or error
disable_find_button = (disable = false) => {
	document.getElementById('access-next-button').disabled = disable;
	display_progress_bar(disable);
	if (!disable) {
		if (current_ids.length < current_cursor) {
			document.getElementById('access-next-button').disabled = true;
		} else {
			document.getElementById('access-next-button').disabled = false;
		}
	}
};

// show progress bar while searching and finding (when find button is disabled)
display_progress_bar = (show = false) => {
	if (show) {
		document.getElementById('progress-bar').classList.remove('invisible');
	} else {
		document.getElementById('progress-bar').classList.add('invisible');
	}
};

// switch 'find' button label to 're-try' on fail with red colour
find_button_label_to_retry = (switch_to_retry = false) => {
	if (switch_to_retry) {
		document.getElementById('access-next-button').textContent = 'Re-try!';
		document.getElementById('access-next-button').classList.add('red', 'darken-1');
	} else {
		document.getElementById('access-next-button').textContent = 'Find!';
		document.getElementById('access-next-button').classList.remove('red', 'darken-1');
	}
};

// truncate lengthy details so it doesn't cover the whole screen, given number of characters doesn't seem to work for some reaso— possibly it includes tags from xml?
truncate_details_text = (details) => {
	return details.length > 300 ? `${details.substring(0, 300)}...` : details;
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
	display_progress_bar();
};

handle_connection_error = (response) => {
	if (!response.ok) {
		throw new Error(response.status);
	}
	return response;
};
