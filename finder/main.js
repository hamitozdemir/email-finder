
search = () => {
	fetch_ids();
	// fetch_mails();

};

fetch_ids = () => {
		let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=Fumihito%20Hirai[Author]+gastroenterology';
	
		fetch(url)
		.then((response) => response.text())
		.then((text) => {
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

			console.log(splice_ids_array(id_list_strings));
		});
};

fetch_mails = () => {
	let url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=11079516,11068439,10050046&rettype=xml&retmode=xml'
	
	fetch(url)
	.then((response) => response.text())
	.then((text) => {
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, 'text/xml');
		let xmldoc = doc.documentElement

		let emails_arr_html_col = xmldoc.getElementsByTagName('email')
		let emails_list = Array.from(emails_arr_html_col);
		console.log(emails_list)


		console.log(emails_list[0].parentNode)
		console.log(emails_list[7].parentNode)

		console.log(emails_list[0].parentNode.nodeName)
		console.log(emails_list[7].parentNode.parentNode)

		// corresp or contrib 
		// corresp: direct contact info under author information
		// contrib: additional mails listed under contributor information

		let corresp_list = [] // corresp>> "information", email
		let contrib_list = [] // contrib>> name>>surname,givenname, address>>email

		emails_list.forEach(elem => {
			if (elem.parentNode.nodeName == 'corresp') {
				corresp_list.push(elem.parentNode);
			} else {
				contrib_list.push(elem.parentNode.parentNode)
			}
		});

		console.log(corresp_list);
		console.log(contrib_list);

		

	});
};

display_results = (text) => {
	document.getElementById('result').innerHTML = text;
};

// split ids array into manageable chunks
splice_ids_array = (arr) => {
	let split_arr = []

	let size = 6; // TODO: check performance difference and change accordingly
	for (let i = 0; i < arr.length; i += size) {
		const chunk = arr.slice(i, i + size);
		split_arr.push(chunk);
	};

	console.log(split_arr);
	return split_arr;
}

	// TODO: have ability to re-try connection if unable to reach for a chunk
	// also have the option to re-try connection on main IDs fetch
	// clear functionality for output
	// on each call append the list of e-mails and info into a different div, spawning on top, so prepend and re-draw? look into .insertAdjacentHTML (https://stackoverflow.com/a/22260849/4085881)
