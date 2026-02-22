1. The "show answer" button doesn't work if I've already made a move
2. The board is in the state where the incorrect move has just been made
3. Clicking "show answer" when that's the case just displays the answer in the sidebar, but the board doesn't update
----------
1. Add an eval bar to the left side of the board component. It should show the eval of the current position, and animate when the eval changes