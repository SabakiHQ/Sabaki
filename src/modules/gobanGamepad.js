const { Gamepad } = require('./gamepad');

export class GobanGamepad {
  constructor(width, height, drawCursor, makeMove, goStep, startAnalysis) {
    this.cursor = [0, 0];
    this.width = width;
    this.height = height;

    this.drawCursor = drawCursor;
    this.makeMove = makeMove;
    this.goStep = goStep;
    this.startAnalysis = startAnalysis;

    this.gamepad = new Gamepad();
    this.gamepad.init();

    this.gamepad.bind(Gamepad.Event.CONNECTED, device => {
      console.log('New device detected: ' + device.id);
    });

    this.gamepad.bind(Gamepad.Event.DISCONNECTED, device => {
      console.log('Device disconnected: ' + device.id);
    });

    this.gamepad.bind(Gamepad.Event.AXIS_CHANGED, function(event) {
      //console.log(event);
    });

    this.gamepad.bind(Gamepad.Event.BUTTON_DOWN, event => {
      //console.log(event);
    });

    this.gamepad.bind(Gamepad.Event.BUTTON_UP, event => {
      if (event.control.startsWith('DPAD_')) {
        const previousCursor = this.cursor.slice();

        switch (event.control) {
          case 'DPAD_UP':
            if (this.cursor[1] == 0) {
              this.cursor[1] = this.height - 1;
            } else {
              this.cursor[1] -= 1;
            }
            break;
          case 'DPAD_DOWN':
            if (this.cursor[1] == this.height - 1) {
              this.cursor[1] = 0;
            } else {
              this.cursor[1] += 1;
            }
            break;
          case 'DPAD_RIGHT':
            if (this.cursor[0] == this.width - 1) {
              this.cursor[0] = 0;
            } else {
              this.cursor[0] += 1;
            }
            break;
            break;
          case 'DPAD_LEFT':
            if (this.cursor[0] == 0) {
              this.cursor[0] = this.width - 1;
            } else {
              this.cursor[0] -= 1;
            }
            break;
          default:
        }

        // Update markers to current cursor
        this.drawCursor(
          this.cursor,
          {
            type: 'cross',
            label: null,
          },
          previousCursor,
        );
      }
      // Make a move
      else if (event.control === 'FACE_3') {
        this.makeMove(this.cursor);
      }
      // Disable the cursor
      else if (event.control === 'FACE_1') {
        // Update markers to current cursor
        this.drawCursor(
          this.cursor,
          {
            type: null,
            label: null,
          },
          this.cursor,
        );
      }
      // Start analysis
      else if (event.control === 'FACE_4') {
        this.startAnalysis();
      }
      // Navigation: forward
      else if (event.control === 'RIGHT_TOP_SHOULDER') {
        this.goStep(1);
      }
      // Navigation: back
      else if (event.control === 'LEFT_TOP_SHOULDER') {
        this.goStep(-1);
      } else {
        console.log(event.control);
      }
    });
  }

  keyUpCallback(event) {

    if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(event.code)) {
      const previousCursor = this.cursor.slice();

      switch (event.code) {
        case 'KeyW':
          if (this.cursor[1] == 0) {
            this.cursor[1] = this.height - 1;
          } else {
            this.cursor[1] -= 1;
          }
          break;
        case 'KeyS':
          if (this.cursor[1] == this.height - 1) {
            this.cursor[1] = 0;
          } else {
            this.cursor[1] += 1;
          }
          break;
        case 'KeyD':
          if (this.cursor[0] == this.width - 1) {
            this.cursor[0] = 0;
          } else {
            this.cursor[0] += 1;
          }
          break;
          break;
        case 'KeyA':
          if (this.cursor[0] == 0) {
            this.cursor[0] = this.width - 1;
          } else {
            this.cursor[0] -= 1;
          }
          break;
        default:
      }

      // Update markers to current cursor
      this.drawCursor(
        this.cursor,
        {
          type: 'cross',
          label: null,
        },
        previousCursor,
      );
    }
    // Make a move
    else if (event.code === 'Space') {
      this.makeMove(this.cursor);
    }
    // Disable the cursor
    else if (event.code === 'Backspace') {
      // Update markers to current cursor
      this.drawCursor(
        this.cursor,
        {
          type: null,
          label: null,
        },
        this.cursor,
      );
    }
    // Start analysis
    else if (event.code === 'KeyZ') {
      this.startAnalysis();
    }
    // Navigation: forward
    else if (event.code === 'KeyE') {
      this.goStep(1);
    }
    // Navigation: back
    else if (event.code === 'KeyQ') {
      this.goStep(-1);
    } else {
      console.log(event.code);
    }

  }
}
