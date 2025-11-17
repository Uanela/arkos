/**
* A simple array of available `apiAction` field when using auto generate API (That uses BaseService)
* class behind the scenes.
* 
* Is worth mentioning that this will be addded into `arkos` as an util.
*
* @see {@link https://www.arkosjs.com/docs/advanced-guide/handling-relation-fields-in-prisma-body-requests#the-apiaction-property} 
*/
const apiActions = ["connect", "disconnect", "delete", "update", "create"];

export default apiActions
