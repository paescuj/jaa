import { Store } from 'pullstate';

export const ActionStore = new Store({
  // State of menu
  menuIsOpen: false,
  // List of buttons which can toggle the action menu
  menuToggles: [],
});
