let topLeftCell = document.querySelector(".top-left-cell");
let topRow = document.querySelector(".top-row");
let leftCol = document.querySelector(".left-col");
let allCells = document.querySelectorAll(".cell");
let formulaInput = document.querySelector("#formula");
let address = document.querySelector("#address");
let lastSelectedCell;

cellsContainer.addEventListener("scroll", function(e){
    // console.log(e.target);        //we will find height and width where the page is after scrolling
    let topOffset = e.target.scrollTop; 
    let leftOffset = e.target.scrollLeft;

    topLeftCell.style.top = topOffset + "px";
    topLeftCell.style.left = leftOffset + "px";
    topRow.style.top = topOffset + "px";
    leftCol.style.left = leftOffset + "px";
});

formulaInput.addEventListener("blur", function(e){
    let formula = e.target.value;
    if(formula){
        let cellObject = getCellObjectFromElement(lastSelectedCell);
        if(cellObject.formula != formula){
            deleteFormula(cellObject);           //to handle formula to formula case
        }
        let calculatedValue = solveFormula(formula, cellObject);
        //UI Update
        lastSelectedCell.textContent = calculatedValue;
        //DB Update
        cellObject.value = calculatedValue;
        cellObject.formula = formula;
        //childrens update
        updateChildrens(cellObject.childrens);
    }
});

function attachClickAndBlurEventOnCell(){
    for(let i = 0 ; i < allCells.length ; i++){
        allCells[i].addEventListener("click", function(e){           //to show the info of each cell on formula nd 
            let cellObject = getCellObjectFromElement(e.target);    //address bar
            formulaInput.value = cellObject.formula;
            address.value = cellObject.name;

            let allActiveMenus = document.querySelectorAll("active-menu");
            if(allActiveMenus){
                for(let i = 0 ; i < allActiveMenus.length ; i++){
                    allActiveMenus[i].classList.remove("active-menu");
                }
            }

            let {bold, italic, underline} = cellObject.fontStyles;
            bold && document.querySelector(".bold").classList.add("active-menu");
            italic && document.querySelector(".italic").classList.add("active-menu");
            underline && document.querySelector(".underline").classList.add("active-menu");

            let textAlign = cellObject.textAlign;
            document.querySelector("." + textAlign).classList.add("active-menu");
        });
    
        allCells[i].addEventListener("blur", function(e){  //whenever a cell become inactive that value will be saved
            // console.log(e);
            lastSelectedCell = e.target;
            //logic to save this value in db
            let cellValueFromUI = e.target.textContent;
            if(cellValueFromUI){
                let cellObject = getCellObjectFromElement(e.target);
    
                //check if the given cell has a formula on it
                if(cellObject.formula && cellValueFromUI != cellObject.value){
                    deleteFormula(cellObject);                 //to handle formula to value case
                    formulaInput.value = "";
                }
                //cellObj ki value update
                cellObject.value = cellValueFromUI;
                //   update childrens of the current updated cell
                updateChildrens(cellObject.childrens);           //to handle value to formula case

                //handle visited cells
                let rowId = lastSelectedCell.getAttribute("rowid");
                let colId = lastSelectedCell.getAttribute("colid");
                if(cellObject.visited == false){
                    visitedCells.push({rowId, colId});
                    cellObject.visited = true;
                }
            }
        });
    }
}
attachClickAndBlurEventOnCell();

function deleteFormula(cellObject){
    cellObject.formula = "";
    for(let i = 0 ; i < cellObject.parents.length ; i++){
        let parentName = cellObject.parents[i]; 
        //A1
        let parentCellObject = getCellObjectFromName(parentName);
        let updatedChildrens = parentCellObject.childrens.filter(function(childName){
            if(cellObject.name == childName)
                return false;
            return true;
        });
        parentCellObject.childrens = updatedChildrens;
    }    
    cellObject.parents = [];
}

function solveFormula(formula, selfCellObject){
    // tip : implement infix evalutaion
    // ( A1 + A2 )  =>  ( 10 + 20 )
    let formulaComps = formula.split(" ");
    //["(", "A1", "+", "A2", ")"]
    //find valid component
    for(let i = 0 ; i < formulaComps.length ; i++){
        let fComp = formulaComps[i];
        if(fComp[0] >= "A" && fComp[0] <= "Z" || fComp[0] >= "a" && fComp[0] <= "z"){
            // A1 || A2
            // fComp = A1
            let parentCellObject = getCellObjectFromName(fComp);
            let value = parentCellObject.value;
            if(selfCellObject){
                //add yourself as a child of parentCellObject
                parentCellObject.childrens.push(selfCellObject.name);
                //update yout parents
                selfCellObject.parents.push(parentCellObject.name);
            }
            formula = formula.replace(fComp, value);        //means converting ( A1 + A2 ) => ( 10 + 20 )
        }
    }
    // ( 10 + 20 ) => infix evaluation
    let calculatedValue = eval(formula);
    return calculatedValue;
}

function getCellObjectFromElement(element){
    let rowId = element.getAttribute("rowid");   //this way we extract the row value of that cell
    let colId = element.getAttribute("colid");
    return db[rowId][colId];
}

function getCellObjectFromName(name){
    //A100   means A used as colid and 100 used as rowid
    let colId = name.charCodeAt(0) - 65; 
    let rowId = Number(name.substring(1)) - 1;
    return db[rowId][colId];
}

function updateChildrens(childrens){
    for(let i = 0 ; i < childrens.length ; i++){
        let child = childrens[i];
        //B1
        let childCellObject = getCellObjectFromName(child);
        let updatedValueOfChild = solveFormula(childCellObject.formula);
        //DB update
        childCellObject.value = updatedValueOfChild;
        //UI update
        let colId = child.charCodeAt(0) - 65;
        let rowId = Number(child.substring(1)) - 1;
        document.querySelector(`div[rowid="${rowId}"][colid="${colId}"]`).textContent = updatedValueOfChild;
        //recursive call
        updateChildrens(childCellObject.childrens);
    }
}   

