const mysql    = require('mysql');
const yaml     = require('js-yaml');
const fs       = require('fs');
const database = 'peq';
const program  = require('commander');

var connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'root',
    database: database
  }
);

connection.connect();

let schemaData                  = {};
const SCHEMA_REFERENCE_YML_FILE = 'database-schema-reference.yml';

const excludedTables = [
  'tblServerListType',
  'tblServerAdminRegistration',
  'tblLoginServerAccounts',
  'tblWorldServerRegistration',
  'zone_state_dump'
];

if (fs.existsSync(SCHEMA_REFERENCE_YML_FILE)) {
  schemaData = yaml.safeLoad(fs.readFileSync(SCHEMA_REFERENCE_YML_FILE, 'utf8'));
  console.log('Loaded schema from [' + SCHEMA_REFERENCE_YML_FILE + ']');
}

console.log(schemaData);

program
  .version('1.0.0')
  .command('pull')
  .description('Pulls database schema and updates working yaml schema reference')
  .action(function (cmd) {

      console.log('hi');

      connection.query(`
        SELECT
          *
        FROM
          INFORMATION_SCHEMA.COLUMNS
        WHERE
          TABLE_SCHEMA = '${database}'
        ORDER BY
          TABLE_NAME,
          ORDINAL_POSITION;
      `, function (error, results, fields) {
          results.forEach(function (row) {
            /**
             RowDataPacket {
                TABLE_CATALOG: 'def',
                TABLE_SCHEMA: 'peq',
                TABLE_NAME: 'aa_ability',
                COLUMN_NAME: 'category',
                ORDINAL_POSITION: 3,
                COLUMN_DEFAULT: '-1',
                IS_NULLABLE: 'NO',
                DATA_TYPE: 'int',
                CHARACTER_MAXIMUM_LENGTH: null,
                CHARACTER_OCTET_LENGTH: null,
                NUMERIC_PRECISION: 10,
                NUMERIC_SCALE: 0,
                DATETIME_PRECISION: null,
                CHARACTER_SET_NAME: null,
                COLLATION_NAME: null,
                COLUMN_TYPE: 'int(10)',
                COLUMN_KEY: '',
                EXTRA: '',
                PRIVILEGES: 'select,insert,update,references',
                COLUMN_COMMENT: '',
                IS_GENERATED: 'NEVER',
                GENERATION_EXPRESSION: null
              }
             */

            if (excludedTables.includes(row.TABLE_NAME)) {
              return;
            }

            if (typeof schemaData[row.TABLE_NAME] === 'undefined') {
              schemaData[row.TABLE_NAME] = {};
            }
            if (typeof schemaData[row.TABLE_NAME][row.COLUMN_NAME] === 'undefined') {
              schemaData[row.TABLE_NAME][row.COLUMN_NAME] = {};
            }

            schemaData[row.TABLE_NAME][row.COLUMN_NAME].dataType = row.DATA_TYPE;
            schemaData[row.TABLE_NAME][row.COLUMN_NAME].nullable = row.IS_NULLABLE;

            if (typeof schemaData[row.TABLE_NAME][row.COLUMN_NAME].description === 'undefined') {
              schemaData[row.TABLE_NAME][row.COLUMN_NAME].description = '';
            }
          });

          /**
           * Write .yml
           */
          fs.writeFileSync(SCHEMA_REFERENCE_YML_FILE, yaml.safeDump(schemaData, {noCompatMode: true }));

          console.log('Updated schema written to [' + SCHEMA_REFERENCE_YML_FILE + ']');
        }
      );


    }
  );

program.parse(process.argv);

connection.end();