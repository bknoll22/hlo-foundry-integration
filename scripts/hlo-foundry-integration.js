/**
 * A single ToDo in our list of Todos.
 * @typedef {Object} ToDo
 * @property {string} id - A unique ID to identify this todo.
 * @property {string} label - The text of the todo.
 * @property {boolean} isDone - Marks whether the todo is done.
 * @property {string} userId - The user who owns this todo.
 */

const DEBUG = true;

console.log("hlo-foundry-integration | Hello World! This code runs immediately when the file is loaded.");

Hooks.on("init", function() {
  console.log("hlo-foundry-integration | This code runs once the Foundry VTT software begins its initialization workflow.");
});

Hooks.on("ready", function() {
  console.log("hlo-foundry-integration | This code runs once core initialization is ready and game data is available.");
});

Hooks.once("init", function() {
    CONFIG.debug.hooks = true;
    ToDoList.initialize();
});

class ToDoList {
    static ID = 'hlo-foundry-integration';

    static initialize() {
        this.toDoListConfig = new ToDoListConfig();
    
        game.settings.register(this.ID, this.SETTINGS.INJECT_BUTTON, {
          name: `TODO-LIST.settings.${this.SETTINGS.INJECT_BUTTON}.Name`,
          default: true,
          type: Boolean,
          scope: 'client',
          config: true,
          hint: `TODO-LIST.settings.${this.SETTINGS.INJECT_BUTTON}.Hint`,
          onChange: () => ui.players.render()
        });
      }

    static FLAGS = {
        TODOS: 'todos'
    }

    static SETTINGS = {
        INJECT_BUTTON: 'inject-button'
    }

    static TEMPLATES = {
        TODOLIST: `modules/${this.ID}/templates/hlo-foundry-integration.hbs`
    }

    static log(force, ...args) {
        if (DEBUG) {
            console.log(this.ID, '|', ...args);
        }
    }
}

Hooks.on('renderPlayerList', (playerList, html) => {
    // if the INJECT_BUTTON setting is false, return early
    if (!game.settings.get(ToDoList.ID, ToDoList.SETTINGS.INJECT_BUTTON)) {
      return;
    }
  
    // find the element which has our logged in user's id
    const loggedInUserListItem = html.find(`[data-user-id="${game.userId}"]`)
  
    // create localized tooltip
    const tooltip = game.i18n.localize('TODO-LIST.button-title');
  
    // insert a button at the end of this element
    loggedInUserListItem.append(
      `<button type='button' class='todo-list-icon-button flex0' title="${tooltip}">
        <i class='fas fa-tasks'></i>
      </button>`
    );
  
    // register an event listener for this button
    html.on('click', '.todo-list-icon-button', (event) => {
      const userId = $(event.currentTarget).parents('[data-user-id]')?.data()?.userId;
  
      ToDoList.toDoListConfig.render(true, { userId });
    });
  });

class ToDoListData {
    
    static getToDosForUser(userId) {
        return game.users.get(userId)?.getFlag(ToDoList.ID, ToDoList.FLAGS.TODOS)
    }

    static get allToDos() {
        const allToDos = game.users.reduce((accumulator, user) => {
            const userToDos = this.getToDosForUser(user.id);

            return {
                ...accumulator,
                ...userToDos
            }
        }, {});

        return allToDos;
    }

    static createToDo(userId, toDoData) {
        // generate a random id for this new ToDo and populate the userId
        const newToDo = {
            isDone: false,
            ...toDoData,
            id: foundry.utils.randomID(16),
            userId,
        }

        const newToDos = {
            [newToDo.id]: newToDo
        }

        // update the database with the new ToDos
        return game.users.get(userId)?.setFlag(ToDoList.ID, ToDoList.FLAGS.TODOS, newToDos);
    }

    static updateToDo(toDoId, updateData) {
        const relevantToDo = this.allToDos[toDoId];

        // construct the update to send
        const update = {
            [toDoId]: updateData
        }

        // update the database with the updated ToDo list
        return game.users.get(relevantToDo.userId)?.setFlag(ToDoList.ID, ToDoList.FLAGS.TODOS, update);
    }

    static updateUserToDos(userId, updateData) {
        return game.users.get(userId)?.setFlag(ToDoList.ID, ToDoList.FLAGS.TODOS, updateData);
    }

    static deleteToDo(toDoId) {
        const relevantToDo = this.allToDos[toDoId];

        // Foundry specific syntax required to delete a key from a persisted object in the database
        const keyDeletion = {
            [`-=${toDoId}`]: null
        }

        // update the database with the updated ToDo list
        return game.users.get(relevantToDo.userId)?.setFlag(ToDoList.ID, ToDoList.FLAGS.TODOS, keyDeletion);
    }
}

class ToDoListConfig extends FormApplication {
    
    static get defaultOptions() {
        const defaults = super.defaultOptions;

        const overrides = {
            height: 'auto',
            id: 'todo-list',
            template: ToDoList.TEMPLATES.TODOLIST,
            title: 'To Do List',
            userId: game.userId,
            closeOnSubmit: false, // do not close when submitted
            submitOnChange: true, // submit when any input changes      
        };

        const mergedOptions = foundry.utils.mergeObject(defaults, overrides);

        return mergedOptions;
    }

    getData(options) {
        return {
            todos: ToDoListData.getToDosForUser(options.userId)
        }
    }

    async _updateObject(event, formData) {
        const expandedData = foundry.utils.expandObject(formData);

        await ToDoListData.updateUserToDos(this.options.userId, expandedData);

        this.render();
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.on('click', "[data-action]", this._handleButtonClick.bind(this));
    }

    async _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        const toDoId = clickedElement.parents('[data-todo-id]')?.data()?.todoId;
    
        ToDoList.log(false, 'Button Clicked!', { this: this, action, toDoId });
    
        switch (action) {
          case 'create': {
            await ToDoListData.createToDo(this.options.userId);
            this.render();
            break;
          }
    
          case 'delete': {
            const confirmed = await Dialog.confirm({
              title: game.i18n.localize("TODO-LIST.confirms.deleteConfirm.Title"),
              content: game.i18n.localize("TODO-LIST.confirms.deleteConfirm.Content")
            });
    
            if (confirmed) {
              await ToDoListData.deleteToDo(toDoId);
              this.render();
            }
    
            break;
          }
    
          default:
            ToDoList.log(false, 'Invalid action detected', action);
        }
    }
}