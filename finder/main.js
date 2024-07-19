
search = () => {
	//parse_ncbi_result('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=Fumihito%20Hirai[Author]+gastroenterology');
	let url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=Fumihito%20Hirai[Author]+gastroenterology"
	//console.log('here be things');
	fetch(url)
  .then((response) => response.text())
  .then((text) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/xml");
		let id_arr_html_col = doc.documentElement.childNodes[3].children

		//let id_list = [].slice.call(id_arr_html_col);
		let id_list = Array.from(id_arr_html_col);
		console.log(id_list) // Id objects
		console.log(id_list[0].textContent) // id as string stripped from <Id> </Id>
		console.log(typeof(id_list[0])) // object
		console.log(typeof(id_list[0].textContent)) // string
  });


};

parse_ncbi_result = (url) => {
	parser = new DOMParser();
	xml_doc = parser.parseFromString(url, 'text/xml')
	document.getElementById('result').innerHTML = new XMLSerializer().serializeToString(xml_doc);

}
