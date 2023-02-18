'use strict';

// Get a reference to the jdbc driver.
const _ = require('lodash');
const JDBC = require('./lib/jdbc');
const sqlTypes = require('./lib/constants/sql-types').types;
const parameterTypes = require('./lib/constants/parameter-types');
const Utils = require('./lib/utilities');

// driver.
let jdbc = null;


// Reference to the logger. Defaults to console.
// NOTE: This assumes the logger has a .info, .warn, and .error function.
let logger = console;

// add the sql types and parameter types mapping objects as an exports properties.
exports.sqlTypes = sqlTypes;
exports.parameterTypes = parameterTypes;

//======================================================================================
// Getters and Setters.
//======================================================================================


//======================================================================================
// Configuration Functions.
//======================================================================================

/**
 * Initializes the jdbc connection.
 * @param options - The db options.
 */
exports.initialize = (options) => {
  // if logger is set.
  if (_.has(options, 'logger')) {
    logger = options.logger;
  }

  // set the jdbc driver.
  jdbc = new JDBC(options);

  // connect.
  return jdbc.connect();
};

/**
 * Closes all connections in the pool.
 * @param callback - The finished callback function.
 */
exports.closeAll = () => {
  return jdbc.close();
};

//======================================================================================
// Query and Statement Functions.
//======================================================================================

/**
 * Executes a sql string on the AS400.
 * @param sql
 */
exports.executeSqlString = (sql) => jdbc.executeQuery(sql, []);


/**
 * Executes a sql string on the AS400.
 * @param sql
 * @param parameters
 */
exports.executePreparedStatement = (sql, parameters) => jdbc.executeQuery(sql, parameters);

/**
 * Executes a sql string on the AS400.
 * @param sql
 * @param parameters
 */
exports.executeUpdatePreparedStatement = (sql, parameters) =>  jdbc.executeStatement(sql, parameters);

/**
 * Executes a prepared statement on the AS400 using an existing connection.
 * @param connection
 * @param sql
 * @param parameters
 */
exports.executeUpdateStatementInTransaction = (connection, sql, parameters) =>  jdbc.executeStatementInTransaction(connection, sql, parameters);


/**
 * Executes a stored procedure.
 * @param sql - The procedure call.
 * @param parameters - Array of parameter objects.
 */
exports.executeStoredProcedure = (sql, parameters) =>  jdbc.executeStoredProcedure(sql, parameters);

//======================================================================================
// Create Parameter Functions.
//======================================================================================

/**
 * Creates an input field parameter object for the stored procedure parameters array call.
 * @param value - The actual value.
 */
exports.createSPInputParameter = (value) => {
  return {
    type: parameterTypes.INPUT_PARAM,
    value: Utils.convertNulls(value)
  };
};

/**
 * Creates an output parameter field object for the stored procedure parameters array call.
 * @param sqlDataType - The sql data type.
 * @param fieldName - The field name string.
 */
exports.createSPOutputParameter = (sqlDataType, fieldName) => {
  return {
    type: parameterTypes.OUTPUT_PARAM,
    fieldName: fieldName,
    dataType: sqlDataType
  };
};
