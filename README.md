JT-400JDBC - Promise versión
===========

JDBC Wrapper for the JT400 driver to connect to an AS400 using JDBC.

CREDITS - CREDITOS (https://www.npmjs.com/package/dh-400jdbc)
Usage
=============

1. Require the module:

    ```
    const jdbc = require('jt-400jdbc');
    ``` 

2. Initialize the connection: (Inicializar conexión)
    ```
    // build the config.
    let config = {
      host: 'String', // Host
      libraries: <String>, // ServiceName
      username: <String>, //username
      password: <String>, //password
      initialPoolCount: <Number>, // Optional, Defaults to 1.
      logger: <Logger Reference> // Optional, Defaults to console.
    };
   
    // initialize the module. - Inicializar conexión a AS400
    jdbc.initialize(config)
       .then(() => console.log('connected'))
       .catch((err) => console.log(error));
    ```
   
3. Execute a SQL query - Ejecutar una consulta de SQL:
    ```
    jdbc.executeSqlString('SELECT * FROM TABLENAME')
       .then((results) => console.log(results))
       .catch((err) => console.log(error));
    ````
   
4. Execute a prepared statement query. Note: parameters is an array of values:
Ejecutar una consulta preparada, parameters es un array []
    ```
    jdbc.executePreparedStatement(sql, parameters)
       .then((results) => console.log(results))
       .catch((err) => console.log(error));
    ```
   
5. Execute an update prepared statement. Note: parameters is an array of values:
    ```
    jdbc.executeUpdatePreparedStatement(sql, parameters)
       .then((result) => console.log(result)) // true if executed
       .catch((err) => console.log(error));
    ```
   
6. Executing a stored procedure. Note: the parameters array is an array of stored procedure parameter objects.
    
    - You can create the objects in this format:
        ```
        {
          type: <'in' or 'out'>,
          fieldName: <String>,
          dataType: <String from sql types constants property>,
          value: <any type>
        }
        ```
   
    - Or use the convenience functions:
        ```
        let inputParameter = jdbc.createSPInputParameter(value);
        let outputParameter = jdbc.createSPOutputParameter(sqlDataType, fieldName);
        
        jdbc.executeStoredProcedure(sql, [inputParameter, outputParameter])
            .then((results) => console.log(results))
            .catch((err) => console.log(error));
        ```
   
    - Execute the statement:
        ```
        jdbc.executeStoredProcedure(sql, parameters)
            .then((results) => console.log(results))
            .catch((err) => console.log(error));
        ```
  
    - Note: The result object is a key value object where the keys are the output parameter field names.
        ```
        {
          <field name 1> : <output param value 1>,
          <field name 2> : <output param value 2>,
          <field name 3> : <output param value 3>,
        }
        ```
      
    - Note: If your stored procedure returns 1 or more result sets you can access them through the result objects resultSets property. The resultsSetsProperty is an array of arrays where each array is a single result set:
        ```
        {
          outputParam1: <value>,
          outputParam2: <value>,
          resultSets: [
            [],
            []
          ]
        }
        ```
