import {Person} from "./Person.js";

export class Situation{
    constructor(){
        /**@type {Set<Person>} */
        this.persons=new Set();
    }
    /**
     * 
     * @param {string} name 
     * @returns {Person?} -the searched person or null if no person with the given name exists
     */
    getPerson(name){
        for(let person of this.persons){
            if(person.name==name)
                return person;
        }
        return null;
    }
    /**
     * 
     * @param {Person} toAdd 
     */
    addPerson(toAdd){
        this.persons.add(toAdd);
    }
}