// const regex = new RegExp("/\[.*\]\((https:\/\/|http:\/\/).*\)/g");
const regex = /\[.*\]\((https:\/\/|http:\/\/).*\)/g;

function resolveUrl(occurrence) {
    return occurrence.substring(
        occurrence.lastIndexOf("(") + 1, 
        occurrence.lastIndexOf(")")
    );
} 

/**
 * find all urls and return in the form of
 * { from: <num>, to: <num>, url: <string>, raw: <string> }
 * @param {String} content
 * 
 * @return Array
 */
module.exports = function(content) {
    
    if(!content) {
        return;
    }

    let result, occurrences = [];

    while ( (result = regex.exec(content)) !== null ) {

        const occurrence = result[0],
            index = result.index;

        occurrences.push({
            raw: occurrence,
            from: index,
            to: index + occurrence.length,
            url: resolveUrl(occurrence)
        });
    }

    return occurrences
} 