import {Person} from "./Person";

/**
 * @class
 * @property {number?} intensity - Probability of infecting the other one
 * @property {Date?} date
 */
class ContactOptions{
    intensity:number=0.5;
    date:Date=new Date();
}

/**
 * @class
 * @extends {ContactOptions}
 */
export class Contact extends ContactOptions{
    a: Person;
    b: Person;
    /**
     * 
     * @param {Person} a 
     * @param {Person} b 
     * @param {ContactOptions} options 
     */
    constructor(a: Person,b: Person,options: ContactOptions){
        super();
        this.a=a;
        this.b=b;
        Object.assign(this,options);
    }
    process(){
        
    }
}