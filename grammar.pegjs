Production "production"
  = _ predecessor:Identifier _ "-->" _ successor:Successor _
  {
  	return { predecessor: predecessor, successor: successor };
  }
  
Successor "successor"
  = ShapeOperation / Identifier
  
Identifier "identifier"
  = value: ([a-zA-Z]+) { return value.join(""); }

ShapeOperation "shape_operation"
  = operator:(
        "extrude" / 
        "comp" /
        "split" /
        "s" / 
        "r" / 
        "t"
        ) 
    _ "(" _ args0:(Expression (_ "," _ Expression)*)? _ ")" 
    args1:(_ (("{" _ ((Float _ ":" _)? Successor) (_ "|" _ ((Float _ ":" _)? Successor))* _ "}") / Successor)) {
    	var parameters = [];
        if (args0.length > 0) {
        	parameters.push(args0[0]);
            var field = args0[1];
            for (var i = 0; i < field.length; i++) {
            	parameters.push(field[i][3]);
            }
        }
        var operations = [];
        // multiple operations
        if (args1[1].constructor === Array) {
        	var field = args1[1][2];
            var operationParam = (field[0].length > 0) ? field[0][0] : null;
            var operationValue = field[1];
        	operations.push({ parameter: operationParam, value: operationValue });
            for (var i = 0; i < args1[1][3].length; i++) {
            	field = args1[1][3][i][3];
            	operationParam = (field[0].length > 0) ? field[0][0] : null;
                operationValue = field[1]; 
            	operations.push({ parameter: operationParam, value: operationValue });
            }
        }
        // single operation
        else {
        	operations.push(args1[1]);
        }
    	return { operator: operator, parameters: parameters, operations: operations };
    }
    
Expression "expression"
  = head:Factor tail:(_ ("+" / "-" / "*" / "/" / "%" / "^") _ Factor)* {
		var result = head;
		for (var i = 0; i < tail.length; i++) {
			if (tail[i][1] === "+") { result += tail[i][3]; }
			if (tail[i][1] === "-") { result -= tail[i][3]; }
			if (tail[i][1] === "*") { result *= tail[i][3]; }
			if (tail[i][1] === "/") { result /= tail[i][3]; }
			if (tail[i][1] === "%") { result = result % tail[i][3]; }
			if (tail[i][1] === "^") { result = Math.pow(result, tail[i][3]); }
			else { throw new Exception("unknown expression"); }
		}
		return result;
    }

Axis "axis"
  = "X" / "Y" / "Z"

Factor "factor"
  = "(" _ expression:Expression _ ")" { return expression; } /
  Axis /
  Float

Float "float"
  = ([0-9]+("."[0-9]*)?) { return parseFloat(text()); }

_ "whitespace"
  = [ \t\n\r]*