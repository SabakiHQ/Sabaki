module.exports = [
    {
        label: '&Game',
        submenu: [
            {
                label: '&New',
                accelerator: 'CmdOrCtrl+N'
            },
            {
                label: '&Load...',
                accelerator: 'CmdOrCtrl+O'
            },
            { type: 'separator' },
            {
                label: '&Save',
                accelerator: 'CmdOrCtrl+S'
            },
            {
                label: 'Save &As...',
                accelerator: 'CmdOrCtrl+Shift+S'
            },
            { type: 'separator' },
            {
                label: '&Info',
                accelerator: 'CmdOrCtrl+I'
            }
        ]
    },
    {
        label: '&Navigation',
        submenu: [
            {
                label: '&Back',
                accelerator: 'CmdOrCtrl+Left'
            },
            {
                label: '&Forward',
                accelerator: 'CmdOrCtrl+Right'
            },
            {
                label: 'Go To &Beginning',
                accelerator: 'CmdOrCtrl+Home'
            },
            {
                label: 'Go To &End',
                accelerator: 'CmdOrCtrl+End'
            },
            { type: 'separator' },
            {
                label: 'Go To Move...',
                accelerator: 'CmdOrCtrl+G'
            },
        ]
    },
    {
        label: '&View',
        submenu: [
            {
                label: 'Show &Coordinates',
                accelerator: 'CmdOrCtrl+C'
            },
            {
                label: 'Show &Variations',
                accelerator: 'CmdOrCtrl+V'
            },
            { type: 'separator' },
            {
                label: 'Show &History',
                accelerator: 'CmdOrCtrl+H'
            }
        ]
    },
    {
        label: '&Help',
        submenu: [
            {
                label: '&About Goban'
            }
        ]
    }
]