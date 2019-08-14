module.exports = function(content) {
    
    if(!content) {
        return;
    }

    // TODO: find all occurrences and return in the form of
    // { from: <num>, to: <num>, url: <string> }
    return content.substring(
        content.lastIndexOf("(") + 1, 
        content.lastIndexOf(")")
    );
} 