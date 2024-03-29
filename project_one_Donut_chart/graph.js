// A single slice of pie is generated by an internal angle, which determines
// the internal area of the the slice
//

// D3 has a pie generator d3.pie() that uses our data to generate the internal angles (in radiants)

// We need to create a path to use the pie (the arc is made using the path = 'M150 ...')
// using d3.arc()
//

//set up dimensions
const dims = {
  height: 300,
  width: 300,
  radius: 150
};

// center with x and y coor props
  // x, y coor: take half of the width and add on 5 to give a bit of room
const cent = { x: (dims.width / 2 + 5), y:(dims.height / 2 + 5)};

const svg = d3.select('.canvas')
              .append('svg')
              .attr('width', dims.width + 150) //add 150px of extra space on right for legend
              .attr('height', dims.height + 150);//150px just for breathing room on the bottom

//create a group that contains all the graph elements
const graph = svg.append('g')         //translate group along the center to the cent.x and cent.y coor
                                      //translate to the center of the svg container defined above
                  .attr('transform', `translate(${cent.x}, ${cent.y})`);
                                      // use back ticks (under tilda) and translate keyword to dynamically
                                      // output vars inside the string (called template string)
// create a const to use the builtin d3.pie() func
const pie = d3.pie()
              .sort(null)//don't re-sort data based on angle size
              .value(d => d.cost); // look at each object and generate angle based on cost
//
// // dummy data for diagnostics
// const angles = pie([
//   {name: 'rent', cost: 500}, //This should have the largest angle
//   {name: 'bills', cost: 300},
//   {name: 'gaming', cost: 200}, //should be the smallest
// ])
//
// console.log(angles) // Adds up to 2pie radiants and rent has the largest randiant angle
//
//
// // must specify outer radius (already defined above)
// // can also have an inner radius for a donut chart
const arcPath = d3.arc()
                 .outerRadius(dims.radius)
                 .innerRadius(dims.radius / 2);//start slice halfway in

// We want to change the colors of the pie chart elements
// d3['schemeSet3'] is a predefined d3 color array
const color = d3.scaleOrdinal(d3['schemeSet3'])

// console.log(arcPath(angles[0]))//get back a long path string for the first angle (for rent) in the console


//Legend using d3-legend plugin
const legendGroup = svg.append('g')
                        //move legend by the width of the pie + 40px in the x direction and 10px from top for y
                       .attr('transform', `translate(${dims.width + 40}, 10)`);
                  //from the plugin
const legend = d3.legendColor()
                 .shape('circle')//each item will have a circle
                 .shapePadding(10)//add 10px of space b/w legend items
                 .scale(color); //use the color scale defined above

//More info when hovering over an element
const tip = d3.tip()
                            //card is a materialize-css class
              .attr('class', 'tip card')
              .html(d => {
                let content = `<div class='name'>${d.data.name}</div>` //give it a class for styling purposes at top of index.html
                content += `<div class='cost'>$${d.data.cost}</div>`//just concatenate string above
                content += `<div class='delete'>Click slice to delete</div>`
                return content
              });
graph.call(tip);//applies all shapes created by const tip to the graph group

// update func: will draw the paths
const update = (data) => {



  //update color scale domain
  // map func allows us to grab cycle through the data array and perfom a func on each item in the array
  // Here we want to grab the name from the array (since the name can change as we add, delete, modify data)
  color.domain(data.map(d => d.name));

  //update and call legend
  legendGroup.call(legend);
  legendGroup.selectAll('text')
             .attr('fill', 'white')



  //join enhanced (pie) data to path elements
  const paths = graph.selectAll('path')
                      .data(pie(data)); //pie(data) will spit out the new array with the angles attached


  // handle the exit selection
    // When something is deleted from firebase, it is put into the exit selection, using .exit() finds those
    // using .remove() removes those selected
  paths.exit()
       .transition().duration(1000)
       .attrTween('d', arcTweenExit)
        .remove();


  // handle the current DOM path updates
  paths.attr('d', arcPath)//fires off the func and will pass in the d (data) and gives back the path string
       .transition().duration(1000)
        .attrTween('d', arcTweenUpdate);


  // Enter selection: adding new elements (slices)
  paths.enter()
        .append('path')
          .attr('class', 'arc')
                    // .attr('d', d => { arcPath(d) } ) what is really happening
          .attr('d', arcPath)//fires off the func and will pass in the d (data) and gives back the path string
          .attr('stroke', '#fff')//white stroke
          .attr('stroke-width', 3)
                                  // in the console, the name is we bound above in pie(data) line 70, is
                                  // under data.name, which is why we cannot simply use d.name as before
          .attr('fill', d => color(d.data.name))

          .each(function (d) { //allows us to perform a func for each element
            this._current = d  // a => (arrow func) would not allow us to use the 'this' keyword
                               // apply 'this' prop to the current path
          })

          .transition().duration(1000)
            .attrTween('d', arcTweenEnter);

  // Add events: interact with data elements
  //the selectAll will give us the index and array properties as well
  graph.selectAll('path') //all the slices are composed of path elements
       .on('mouseover', (d, i, n) => {//only way we can specify two diff funcs for one event
        tip.show(d, n[i]);//show expects two parameters. In this case, we wanted to use the this keyword but we
                        // can't do that with an => (arrow func), so using n[i] does the same thing
        handleMouseOver(d, i, n);
       }) //complete handleMouseOver function when mouse is hovering over a path element
       .on('mouseout', (d, i, n) => {
         tip.hide();
         handleMouseOut(d, i, n);
       })//when mouse is no longer hovering over that element
       .on('click', handleClick)
};


// data array and firestore
var data = [];

//Set up realtime listener to listen to firebase

db.collection('expenses').onSnapshot(res => {
  res.docChanges().forEach(change => {

// below is copied from previous lesson
    const doc = {...change.doc.data(), id: change.doc.id}

    switch (change.type) {
      case 'added':
        data.push(doc);
        break;
      case 'modified':
        const index = data.findIndex(item => item.id == doc.id);
        data[index] = doc;
        break;
      case 'removed':
        data = data.filter(item => item.id !== doc.id);
        break;
      default:
        break;
    }
  });
  update(data);
});


// define a func to animate slices
//This is just for the a new slice entering
const arcTweenEnter = (d) => {
                        //endAngle is a property made by d3.pie()
  var i = d3.interpolate(d.endAngle, d.startAngle); //give a value b/w end-angle and start-angle
                                                  // over time we will update this so that it gets closer start-angle
  return function (t) {
    d.startAngle = i(t); //when t=0 start angle is close to end angle (so slice will be 0)
                        // As t -> 1, it will go to the start-angle and slice will the correct size
    // above we are just chaning the angle, but we need to change the path (d='m150...') for the animation

    return arcPath(d);//now over time we get a new path
  }
};


// Define a func for a slice exiting (deleting data)
const arcTweenExit = (d) => {
                        //endAngle is a property made by d3.pie()
  var i = d3.interpolate(d.startAngle, d.endAngle); // does the opposite of the enter func
  return function (t) {
    d.startAngle = i(t); //when t=0 start angle is close to start angle (so slice will be correct size)
                        // As t -> 1, it will go to the end-angle and slice will go to 0

    return arcPath(d);//now over time we get a new path
  }
};



// Define a func for updating slices
  //Here we need to use the 'this' keyword, so we cannot use the => (arrow func)
  // we must use the function keyword

function arcTweenUpdate(d) {
  // shows that arcTweenUpdate runs for every data element in the pie.
  // Each element shows this._current (what path was on page before update)
  // and d (what path is on page now)
  // console.log(this._current, d);


  // interpolate b/w two objects (starting path: this._current and d: current path)
  var i = d3.interpolate(this._current, d);

  //update current property (this._current) with new updated data
  this._current = d; //when transition is all done they should be the same
                    // d is same as i(1)

  return function (t) {
    return arcPath(i(t));
  }

};


// Event handlers: Interactive event listeners funcs
const handleMouseOver = (d, i, n) => { //take in d (data), i (index), and n(array of elements), given by selectAll method
  // console.log(n[i])//gives us element that we are hovering over
  d3.select(n[i])//grab that element and wrap it in a d3 wrapper so that we can apply d3 attrs to it
                // Name transitions to avoid them interupting each other.
    .transition('changeSliceFill').duration(300)
      .attr('fill', 'white')
};

const handleMouseOut = (d, i, n) => {
  d3.select(n[i])
    .transition('changeSliceFill').duration(300)
      .attr('fill', color(d.data.name))
};

const handleClick = (d) => { //this will delete the data element that is clicked on
  // console.log(d.data.id) // d gives the array, d.data gives the actual object with the firebase id, and adding
                            // .id gives the info we need to query the database and delete that object from firebase
  const id = d.data.id;
  db.collection('expenses').doc(id).delete()
}




//
