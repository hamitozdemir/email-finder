
search = () => {
	parse_ncbi_result('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=Fumihito%20Hirai[Author]+gastroenterology');
	console.log('here be things');
};

parse_ncbi_result = (url) => {
	parser = new DOMParser();
	xml_doc = parser.parseFromString(url, 'text/xml')
	document.getElementById('result').innerHTML = new XMLSerializer().serializeToString(xml_doc);

}
