'use strict';

// Module Dependencies.
const _ = require('lodash');
const java = require('java');
const { OUTPUT_PARAM } = require('./constants/parameter-types');
const Utils = require('./utilities');

// Driver Information.
const DRIVER_PATH             = `${__dirname}/../driver/jt400.jar`;
const POOL_DATA_SOURCE_NAME   = 'com.ibm.as400.access.AS400JDBCConnectionPoolDataSource';
const POOL_NAME               = 'com.ibm.as400.access.AS400JDBCConnectionPool';

// Java Setup.
java.classpath.push(DRIVER_PATH);

/**
 * JDBC object class.
 */
class JDBC {
  /**
   * Constructor.
   * @param options - The config options.
   */
  constructor(options) {
    // default values for fields from options.
    this.host = null;
    this.username = null;
    this.password = null;
    this.libraries = null;
    this.initialPoolCount = 1;
    this.logger = console;

    // instance variables.
    this.poolDataSource = null;
    this.pool = null;
    this.connected = false;

    // save all the values on this object.
    _.forEach(Object.keys(options), (key) => {
      this[key] = options[key];
    });
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        this.logger.info('Already connected to AS400. Skipping connect call.');
        resolve(true);
        return;
      }
      try {
        // initialize the pool data source.
        this.poolDataSource = java.newInstanceSync(POOL_DATA_SOURCE_NAME, this.host, this.username, this.password);
        this.poolDataSource.setLibrariesSync(this.libraries);

        // initialize the pool.
        this.pool = java.newInstanceSync(POOL_NAME, this.poolDataSource);

        this.pool.fillSync(this.initialPoolCount);

        this.connected = true;

        resolve(true);
      }
      catch(ex) {
        this.logger.error(`Failed to connect to the AS400: ${ex.message}`);
        this.connected = false;
        reject(ex);
      }
    });
  }

  /**
   * Closes the sql connections.
   */
  close() {
    return new Promise((resolve, reject) => {
      // if we aren't connected.
      if (!this.connected) {
        this.logger.info('Not connected to the AS400. Skipping close.');
        resolve(true);
        return;
      }

      // close the connection pool.
      this.pool.close((err) => {
        if (err) {
          this.logger.error('Failed to close the connection pool');
          reject(err);
          return;
        }

        resolve(true); // maybe
      });

    });
  }

  /**
   * Executes a prepared statement and return results.
   * @param sql - The sql string.
   * @param parameters - Parameters array.
   */

  executeQuery(sql, parameters) {
    return new Promise((resolve, reject) => {
      // variables that need access in finally block.
      let connection = null;
      let statement = null;

      try {
        // get a connection.
        connection = this.pool.getConnectionSync();

        // set the auto commit to true.
        connection.setAutoCommitSync(true);

        // prepare the statement.
        statement = connection.prepareStatementSync(sql);

        // loop over the parameters and run set object on them.
        if (parameters && parameters.length > 0) {
          for (let i = 0; i < parameters.length; i++) {
            statement.setObjectSync(i + 1, Utils.convertNulls(parameters[i]));
          }
        }

        // run the statement and save the result set.
        let rs = statement.executeQuerySync();

        // get the results.
        resolve(getResults(rs));
      }
      catch(ex) {
        this.logger.error(`Error in prepareStatement: ${ex.message}`);
        reject(ex);
      }
      finally {
        try {
          if (statement) {
            statement.closeSync();
          }

          if (connection) {
            connection.closeSync();
          }
        }
        catch(e) {
          // print the error.
          this.logger.error(e.message);
        }
      }
    });
  }

  /**
   * Executes an statement.
   * @param sql - The sql string.
   * @param parameters - The parameters array.
   */
  executeStatement(sql, parameters) {
    return new Promise((resolve, reject) => {
      // variables that need access in finally block.
      let connection = null;
      let statement = null;

      try {
        // get a connection.
        connection = this.pool.getConnectionSync();

        // set the auto commit to true.
        connection.setAutoCommitSync(true);

        // prepare the statement.
        statement = connection.prepareStatementSync(sql);

        // loop over the parameters and run set object on them.
        if (parameters && parameters.length > 0) {
          for (let i = 0; i < parameters.length; i++) {
            statement.setObjectSync(i + 1, Utils.convertNulls(parameters[i]));
          }
        }

        // run the statement and save the result set.
        statement.executeUpdateSync();
        resolve(true);
      }
      catch(ex) {
        this.logger.error(`Error in executeStatement: ${ex.message}`);
        reject(ex);
      }
      finally {
        try {
          if (statement) {
            statement.closeSync();
          }

          if (connection) {
            connection.closeSync();
          }
        }
        catch(e) {
          // print the error.
          this.logger.error(e.message);
        }
      }
    });
  }

  /**
   * Executes a statement in a transaction.
   * @param connection - The DB connection object.
   * @param sql - The sql string.
   * @param parameters - The parameters array.
   */
  executeStatementInTransaction(connection, sql, parameters) {
    return new Promise((resolve, reject) => {
      // variables we need to access in finally.
      let statement = null;
      let connection = null;

      try {
        connection = this.pool.getConnectionSync();
        connection.setAutoCommitSync(false);
        // prepare the statement.
        statement = connection.prepareStatementSync(sql);

        // loop over the params and add them to the statement.
        if (parameters && parameters.length > 0) {
          for(let i = 0; i < parameters.length; i++) {
            statement.setObjectSync(i + 1, Utils.convertNulls(parameters[i]));
          }
        }

        // execute the statement.
        statement.executeUpdateSync();
        connection.commitSync();
        resolve(true);
      }
      catch (ex) {
        this.logger.error(`Error in executeStatementInTransaction: ${ex.message}`);
        connection.rollbackSync();
        reject(ex);
      }
      finally {
        try {
          if (statement) {
            statement.closeSync();
          }
          if (connection) {
            connection.closeSync();
          }
        }
        catch (e) {
          this.logger.error(e.message);
        }
      }
    });
  }

  /**
   * Executes a stored procedure.
   * @param sql - The sql statement.
   * @param parameters - The stored procedure parameters array.
   * @param callback - The finished callback function.
   */
  executeStoredProcedure(sql, parameters) {
    return new Promise((resolve, reject) => {
      // variables we need to access in finally.
      let connection = null;
      let statement = null;
      let resultObj = null;

      try {
        // get a connection.
        connection = this.pool.getConnectionSync();

        // set auto commit.
        connection.setAutoCommitSync(true);

        // get a prepared statement.
        statement = connection.prepareCallSync(sql);

        // loop over the input parameters and run the set object command.
        if (parameters && parameters.length > 0) {
          for (let i = 0; i < parameters.length; i++) {
            if (parameters[i].type === OUTPUT_PARAM) {
              statement.registerOutParameterSync(i + 1, parameters[i].dataType);
            }
            else {
              statement.setObjectSync(i + 1, Utils.convertNulls(parameters[i].value));
            }
          }
        }

        // execute the procedure.
        statement.executeSync();

        // build the result object.
        resultObj = {};

        // get the output parameter values.
        if (parameters && parameters.length > 0) {
          for (let i = 0; i < parameters.length; i++) {
            if (parameters[i].type === OUTPUT_PARAM) {
              resultObj[parameters[i].fieldName] = Utils.trimValue(statement.getObjectSync(i + 1));
            }
          }
        }

        // get result set.
        let rs = statement.getResultSetSync();
        let hasMoreResults = (!_.isUndefined(rs) && !_.isNull(rs));

        // if there is currently a result set. initialize a result array.
        if (hasMoreResults) {
          resultObj.resultSets = [];
        }

        // if rs is set,
        while (hasMoreResults) {
          // get the current set of results.
          let currentResults = getResults(rs);
          if (currentResults) {
            resultObj.resultSets.push(currentResults);
          }

          // check if there are more result sets.
          hasMoreResults = statement.getMoreResultsSync();
          if (hasMoreResults) {
            rs = statement.getResultSetSync();
          }
        }
        resolve(resultObj);
      }
      catch (ex) {
        this.logger.error(`Error in executeStoredProcedure: ${ex.message}`);
        reject(ex);
      }
      finally {
        try {
          if (statement) {
            statement.closeSync();
          }

          if (connection) {
            connection.closeSync();
          }
        }
        catch(e) {
          // print the error.
          this.logger.error(e.message);
        }
      }
    });
  }
}

// export the class.
module.exports = JDBC;

//======================================================================================
// Helper Functions.
//======================================================================================

/**
 * Converts a result set into an array or result objects.
 * NOTE: This throws an exception. Needs to be handled in the calling function.
 * @param rs - The result set object.
 */
function getResults(rs) {
  // store the results.
  let results = [];
  let currentIndex = 0;

  // get the result set metadata.
  let rsmd = rs.getMetaDataSync();

  // build a results array object.
  let cc = rsmd.getColumnCountSync();
  let next = rs.nextSync();

  // loop over all the result rows.
  while (next) {
    // create an object out of the row.
    let row = {};

    // loop for each column.
    for (let i = 1; i <= cc; i++) {
      let key = rsmd.getColumnNameSync(i);
      row[key] = Utils.trimValue(rs.getStringSync(i));
    }

    // add the current index.
    row['index'] = currentIndex;
    currentIndex++;

    // add the row object to the results array.
    results.push(row);

    // increment the pointer to the next row.
    next = rs.nextSync();
  }

  // return results.
  return results;
}
