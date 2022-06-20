import { writable } from "svelte/store";
import type { Writable } from "svelte/store";
                                                                //return type same as Writale structure
export function useStorage<Value>(key:string,initialValue:Value):Writable<Value> {

    let serialize = JSON.stringify;//the process of converting an object into a stream of bytes

    let deserialize = JSON.parse;  //the reverse process is called deserialization

    // get stored value
    let storedValue:Value = deserialize(localStorage.getItem(key));

    //if value exists return it otherwise use initial value
    let store = writable(storedValue ? storedValue : initialValue);

    // subscribe to the store and update local storage when it changes
    store.subscribe((value) => {
        localStorage.setItem(key, serialize(value))
        
    }
    )

    return store;
    
}