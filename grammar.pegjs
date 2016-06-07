////////////////////////////////////////////////////////////////////////////////////////////////////
ParseTree "parseTree"
  = productions:(Production)*

////////////////////////////////////////////////////////////////////////////////////////////////////
Production "production"
  = _ predecessor:Identifier _ "-->" _ successor:Successor _
  {
  	return { predecessor: predecessor, successor: successor };
  }
  
////////////////////////////////////////////////////////////////////////////////////////////////////
NIL "NIL"
  = "NIL" { 
  		return null;
    }

////////////////////////////////////////////////////////////////////////////////////////////////////
Successor "successor"
  = ShapeOperation / Identifier / NIL
  
////////////////////////////////////////////////////////////////////////////////////////////////////
Identifier "identifier"
  = value: ([a-zA-Z]+) { return value.join(""); }

////////////////////////////////////////////////////////////////////////////////////////////////////
Translate "translate" 
	= "t" _ "(" _ x:Expression _ "," _ y: Expression _ "," _ z:Expression _ ")" _ successor:Successor {
    	return { operator: "t", parameters: [x, y, z], operations: [successor] };
	}
    
////////////////////////////////////////////////////////////////////////////////////////////////////
Rotate "rotate" 
	= "r" _ "(" _ x:Expression _ "," _ y: Expression _ "," _ z:Expression _ ")" _ successor:Successor {
    	return { operator: "r", parameters: [x, y, z], operations: [successor] };
	}
    
////////////////////////////////////////////////////////////////////////////////////////////////////
Scale "scale" 
	= "s" _ "(" _ x:Expression _ "," _ y: Expression _ "," _ z:Expression _ ")" _ successor:Successor {
    	return { operator: "s", parameters: [x, y, z], operations: [successor] };
	}
    
////////////////////////////////////////////////////////////////////////////////////////////////////
Extrude "extrude"
	= "extrude" _ "(" _ axis:(Axis _ "," _)? height:Expression _ ")" _ successor: Successor {
    	var axis = (axis != null) ? axis[0] : null;
    	return { operator: "extrude", parameters: [axis, height], operations: [successor] };
    }
    
////////////////////////////////////////////////////////////////////////////////////////////////////
ComponentSelector "component_selector" =
	"f" / "e" / "v"

SemanticSelector "semantic_selector" =
    "front" / "back" / "left" / "right" / "top" / "bottom" / "side" / "all"

ComponentSplitParameter "component_split_parameter" =
	semanticSelector:SemanticSelector _ operator:(":" / "=") _ successor:Successor {
    	return { semanticSelector: semanticSelector, operator: operator, successor: successor };
    }

ComponentSplit "component_split"
	= "comp" _ "(" _ componentSelector:ComponentSelector _ ")" _ "{" 
    		args:(_ ComponentSplitParameter (_ "," _ ComponentSplitParameter)* _)?
        "}" {
        var operations = [args[1]];
        for (var i = 0; i < args[2].length; i++)
        	operations.push(args[2][i][3]);
        return { operator: "comp", parameters: [componentSelector], operations: operations }
    }
    
////////////////////////////////////////////////////////////////////////////////////////////////////
AdjustSelector "adjust_selector" =
	"adjust" / "noAdjust"

SizePrefix "size_prefix" =
    "'" / "~"

XYZSplitParameter "xyz_split_parameter" =
	prefix:(SizePrefix _)? size:Expression _ ":" _ successor:Successor {
    	var prefix = (prefix != null) ? prefix[0] : null;
    	return { prefix: prefix, size: size, successor: successor };
    }

XYZSplit "xyz_split"
	= "split" _ "(" _ splitAxis:Axis adjustSelector:(_ "," _ AdjustSelector)? _ ")" _ "{" _
    	args:(_ XYZSplitParameter (_ "," _ XYZSplitParameter)* _)?
    "}" repeatSwitch:(_ "*" _)? {
    	var operations = [args[1]];
        for (var i = 0; i < args[2].length; i++)
        	operations.push(args[2][i][3]);
        var adjustSelector = (adjustSelector != null) ? adjustSelector[3] : null;
        var repeat = (repeatSwitch != null) ? repeatSwitch[1] == "*" : false;
        return { operator: "xyz_split", parameters: [splitAxis, adjustSelector, repeat], operations: operations };
    }

////////////////////////////////////////////////////////////////////////////////////////////////////
ShapeOperation "shape_operation"
  = Translate / Rotate / Scale / Extrude / ComponentSplit / XYZSplit
    
////////////////////////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////////////////////////
Axis "axis"
  = "X" / "Y" / "Z"

////////////////////////////////////////////////////////////////////////////////////////////////////
Factor "factor"
  = "(" _ expression:Expression _ ")" { return expression; } /
  Axis /
  Float

////////////////////////////////////////////////////////////////////////////////////////////////////
Float "float"
  = ([-]?[0-9]+("."[0-9]*)?) { return parseFloat(text()); }

////////////////////////////////////////////////////////////////////////////////////////////////////
_ "whitespace"
  = [ \t\n\r]*