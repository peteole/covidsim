import {Person} from "./Person";

/**
 * @class
 * @property {number?} intensity - Probability of infecting the other one
 * @property {Date?} date
 */
function ContactOptions(){
    this.intensity=0.5;
    this.date=new Date();
}


/**
 * @class
 * @extends {ContactOptions}
 */
export class Contact extends ContactOptions{
    /**
     * 
     * @param {Person} a 
     * @param {Person} b 
     * @param {ContactOptions} options 
     */
    constructor(a,b,options){
        super();
        this.a=a;
        this.b=b;
        Object.assign(this,options);
    }
    process(){
        
    }
}