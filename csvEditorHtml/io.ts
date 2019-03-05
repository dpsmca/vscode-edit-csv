
/*
 * everything for communication or read / write
 */


/**
* parses the content as csv
* also fills the commentLinesBefore and commentLinesAfter array if comments is enabled
* commentLinesAfter contains all comments after the commentLinesBefore (this includes comments in the data)
* on error the errors are displayed and null is returned
* @param {string} content 
* @returns {[string[], string[][], string[]]| null} [0] comments before, [1] csv data, [2] comments after
*/
function parseCsv(content: string, csvReadOptions: CsvReadOptions): string[][] | null {

	if (content === '') {
		content = defaultCsvContentIfEmpty
	}

	const parseResult = csv.parse(content, {
		...csvReadOptions,
		comments: false, //false gives use all lines we later check each line if it's a comment to merge the cells in that row
	})

	if (parseResult.errors.length === 1 && parseResult.errors[0].type === 'Delimiter' && parseResult.errors[0].code === 'UndetectableDelimiter') {
		//this is ok papaparse will default to ,
	}
	else {
		if (parseResult.errors.length > 0) {
			for (let i = 0; i < parseResult.errors.length; i++) {
				const error = parseResult.errors[i];

				if (error.type === 'Delimiter' && error.code === 'UndetectableDelimiter') {
					//
					continue;
				}

				if (error.row) {
					_error(`${error.message} on line ${error.row}`)
					continue
				}

				_error(`${error.message}`)
			}

			return null
		}
	}

	defaultCsvWriteOptions.delimiter = parseResult.meta.delimiter
	newLineFromInput = parseResult.meta.linebreak

	readDelimiterTooltip.setAttribute('data-tooltip', `${readDelimiterTooltipText} (detected: ${defaultCsvWriteOptions.delimiter})`)

	return parseResult.data
}


/**
 * 
 * @returns {string[][]} the current data in the handson table
 */
function getData(): string[][] {
	//hot.getSourceData() returns the original data (e.g. not sorted...)
	
	if (!hot) throw new Error('table was null')

	return hot.getData()
}

/**
 * @returns {string[]} the first row of the data or an empty array
 */
function getFirstRow(): string[] {
	if (!hot) return []

	if (hot.countRows() === 0) return []

	return hot.getDataAtRow(0)
}

/**
 * return the data in the handson table as a string (with respect to the write options)
 * if comments are enabled the commentLinesBefore and commentLinesAfter are also used
 * @param {any} csvReadOptions used to check if a row is a comment
 * @param {any} csvWriteOptions 
 * @returns {string} 
 */
function getDataAsCsv(csvReadOptions: CsvReadOptions, csvWriteOptions: CsvWriteOptions): string {
	const data = getData()

	if (csvWriteOptions.newline === '') {
		csvWriteOptions.newline = newLineFromInput
	}

	const _conf: import('papaparse').UnparseConfig = {
		...csvWriteOptions,
		quotes: csvWriteOptions.quoteAllFields,
	}

	if (csvWriteOptions.header) {

		//write the header...
		if (!hot) throw new Error('table was null')

		const colHeaderCells = hot.getColHeader() as string[]
		//@ts-ignore
		if (hot.getSettings().colHeaders === defaultColHeaderFunc) {
			//default headers... because the actual header string is html we need to generate the string only column headers
			data.unshift(colHeaderCells.map((p: string, index: number) => getSpreadsheetColumnLabel(index)))
		}
		else {

			if (headerRow === null) {
				throw new Error('header row was null')
			}

			data.unshift(headerRow.map<string>((val) => val !== null ? val : ''))
		}
	}

	for (let i = 0; i < data.length; i++) {
		const row = data[i];

		if (row[0] === null) continue //e.g. when we add a new empty row

		if (typeof csvReadOptions.comments === 'string'
			&& typeof csvWriteOptions.comments === 'string'
			&& row[0].trim().startsWith(csvReadOptions.comments)) {
			//this is a comment
			// data[i] = [`${csvWriteOptions.comments}${row[0].trim().substring(csvReadOptions.comments.length)}`]
			row[0] = row[0].trim().substring(csvReadOptions.comments.length)
			_compressCommentRow(row)
			// data[i] = [`${csvWriteOptions.comments}${csv.unparse([row], _conf)}`]
			data[i] = [`${csvWriteOptions.comments}${row.join(" ")}`]
		}

	}


	//not documented in papaparse...
	//@ts-ignore
	_conf['skipEmptyLines'] = false

	let dataAsString = csv.unparse(data, _conf)

	return dataAsString
}

/**
 * removes all empty trailing cells
 * @param row 
 */
function _compressCommentRow(row: string[]) {

	let delCount = 0
	for (let i = row.length-1; i > 0; i--) {
		const cell = row[i];
		if (cell === null || cell === '') {
			delCount++
			continue
		}

		break
	}

	row.splice(row.length - delCount, delCount)
}

/* --- messages back to vs code --- */

/**
 * called to display the given text in vs code 
 * @param text 
 */
function postVsInformation(text: string) {

	if (!vscode) {
		console.log(`postVsInformation (but in browser)`)
		return
	}

	vscode.postMessage({
		command: 'msgBox',
		type: 'info',
		content: text
	})
}
/**
 * called to display the given text in vs code 
 * @param text 
 */
function postVsWarning(text: string) {

	if (!vscode) {
		console.log(`postVsWarning (but in browser)`)
		return
	}

	vscode.postMessage({
		command: 'msgBox',
		type: 'warn',
		content: text
	})
}
/**
 * called to display the given text in vs code 
 * @param text 
 */
function postVsError(text: string) {

	if (!vscode) {
		console.log(`postVsError (but in browser)`)
		return
	}

	vscode.postMessage({
		command: 'msgBox',
		type: 'error',
		content: text
	})
}

/**
 * called to copy the text to the clipboard through vs code
 * @param text the text to copy 
 */
function postCopyToClipboard(text: string) {

	if (!vscode) {
		console.log(`postCopyToClipboard (but in browser)`)
		return
	}

	vscode.postMessage({
		command: 'copyToClipboard',
		text
	})
}

/**
 * called from ui
 * @param saveSourceFile 
 */
function postApplyContent(saveSourceFile: boolean) {
	const csvContent = getDataAsCsv(defaultCsvReadOptions, defaultCsvWriteOptions)

	//used to clear focus... else styles are not properly applied
	//@ts-ignore
	if (document.activeElement !== document.body) document.activeElement.blur();

	_postApplyContent(csvContent, saveSourceFile)
}
/**
 * called to save the current edit state back to the file
 * @param csvContent 
 * @param saveSourceFile 
 */
function _postApplyContent(csvContent: string, saveSourceFile: boolean) {

	if (!vscode) {
		console.log(`_postApplyContent (but in browser)`)
		return
	}

	vscode.postMessage({
		command: 'apply',
		csvContent,
		saveSourceFile
	})
}

function handleVsCodeMessage(event: { data: ReceivedMessageFromVsCode }) {
	const message = event.data

	switch (message.command) {

		case 'csvUpdate': {

			initialContent = message.csvContent
			resetData(initialContent, defaultCsvReadOptions)

			break
		}

		case "applyPress": {
			postApplyContent(false)
			break
		}

		case 'applyAndSavePress': {
			postApplyContent(true)
			break
		}

		default: {
			_error('received unknown message from vs code')
			break
		}
	}

}