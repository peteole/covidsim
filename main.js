import {Person} from "./src/Person.js";
import {Contact}from "./src/Contact.js";
let a=new Person();
let b=new Person();
let contact=new Contact(a,b,{intensity:0.7});
console.log(a.getInfectionProbability());